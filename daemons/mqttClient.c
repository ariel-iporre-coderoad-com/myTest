/**
*  Copyright (c) 2015 Mojix. All rights reserved.
**/

#include <stdio.h>
#include <string.h>
#include <unistd.h>

#include "debug.h"

#include "zmq.h"
#include "MQTTClient.h"
#include "transport.h"

// ------
#include "pubEvents.h"
#include "mqttClientOpts.h"
#include "mqttClientContinous.h"
#include "mqttClientSummarized.h"
#include "mqttClientHandlers.h"
#include "mac_subscription.h"
#include "mac_task.h"
#include "mac_time.h"
#include "mac_alias.h"
#include "uri_request.h"

#define MQTT_VERSION 3

#define BUFFER_SIZE (1024*500) // support at most for 1k unique tags for the tag read data mac event.
#define PAYLOAD_SIZE (BUFFER_SIZE - 10)

// processing variables
unsigned sseID = 0;
int run = 1;

// See mac_events.h and API document
// The DSP can produce many kinds of records.  Tag reads are of MAC_EVENTTYPE_PACKET.
// Other record types, for example, MAC_EVENTTYPE_ROUND_INFO tells a client that a new
// round of tag reads has started (EPCGlobal Gen2 RFID protocol defines that read operations
// happen in rounds of certain time slots long, e.g., 16, 128, 256, etc.)
char *getEventTypeString(int type) {
    char *result = "UndefinedEventType";

    switch (type) {

        case MAC_EVENTTYPE_RESERVED:
            // type 0
            result = "Reserved";
            break;


        case MAC_EVENTTYPE_HEALTH:
            // type 1
            result = "Health";
            break;


        case MAC_EVENTTYPE_ROUND_START:
            // type 2
            result = "RoundStart";
            break;


        case MAC_EVENTTYPE_RN16_DATA:
            // type 3
            result = "RN16Data";
            break;


        case MAC_EVENTTYPE_TAG_READ_DATA:
            // type 4
            result = "TagReadData";
            break;


        case MAC_EVENTTYPE_READ_REPLY_DATA:
            // type 5
            result = "ReadReplyData";
            break;


        case MAC_EVENTTYPE_ACCESS_STATUS:
            // type 6
            result = "AccessStatus";
            break;


        case MAC_EVENTTYPE_SENSOR_DATA:
            // type 7
            result = "SensorData";
            break;


        case MAC_EVENTTYPE_SENSOR_HEALTH:
            // type 8
            result = "SensorHealth";
            break;

        default:
            break;
    }

    return result;
}


int open_zmqbus_connection(void **zmq_context, void **zmq_sock, char *connect_addr)
{
	int rc;

    // Open input zmq socket.  Open ZMQ as pub/sub design pattern.
    *zmq_context = zmq_ctx_new();
    if (*zmq_context == NULL) {
        log_err("zmq_init: %s", zmq_strerror(errno));
        return -1;
    }
    *zmq_sock = zmq_socket(*zmq_context, ZMQ_SUB);
    if (*zmq_sock == NULL) {

        log_err("zmq_sock: %s", zmq_strerror(errno));
        return -1;
    }
    rc = zmq_setsockopt(*zmq_sock, ZMQ_SUBSCRIBE, NULL, 0);
    if (rc != 0) {
        log_err("zmq_setsockopt: %s", zmq_strerror(errno));
        return -1;
    }

    // We become the subscriber to binary packets published by pubEvents.c
    printf("Connecting to %s\n", connect_addr);
    rc = zmq_connect(*zmq_sock, connect_addr);
    if (rc != 0) {

        log_err("zmq_connect: %s", zmq_strerror(errno));
        return -1;
    }

    return 1;
}

void close_zqmbus_connection(void **zmq_context, void **zmq_sock)
{
    printf("Closing connection to zqmbus\n");
	zmq_close (*zmq_sock);
	zmq_ctx_destroy (*zmq_context);
}

int load_subscription(char *subscription_name, struct mac_events_subscription *subs) 
{
	char spec_filepath[1024] = "";
	if(strlen(subscription_name) == 0) {
		mac_subscription_load_default(subs);
	} else {
		sprintf(spec_filepath, "/var/uploads/%s.eventSpec", subscription_name);
        if(access (spec_filepath, F_OK) != 0) {
            return -1;
        } 
        mac_subscription_load(spec_filepath, subs);
	}
    return 1;
}

int open_mqtt_connection(int mqtt_version, char *mqtt_host, int mqtt_port, char *mqtt_clientid, char *mqtt_username, char *mqtt_password)
{
	int rc;	
	unsigned char buffer[100];
    int buf_len = sizeof(buffer);
    int mqtt_sock_fd;
    int len;


    // mqtt broker init
    printf("Connecting to MQTT Broker %s %d\n", mqtt_host, mqtt_port);

    mqtt_sock_fd = transport_open(mqtt_host, mqtt_port);
    if(mqtt_sock_fd < 0) {
        printf("Unable to open connection to MQTT Broker\n");
    	return -1;
    }

    printf("Successfully connected to MQTT Broker\n");

	MQTTPacket_connectData data = MQTTPacket_connectData_initializer;

    data.willFlag = 0;
    data.MQTTVersion = mqtt_version;
    data.clientID.cstring = mqtt_clientid;
    data.username.cstring = mqtt_username;
    data.password.cstring = mqtt_password;
    data.keepAliveInterval = 0;
    data.cleansession = 1;

    len = MQTTSerialize_connect(buffer, buf_len, &data);
    rc = transport_sendPacketBuffer(mqtt_sock_fd, buffer, len);

    if(rc < 0) {
    	log_err("Unable to open transport connection to MQTT Broker\n");
    	transport_close(mqtt_sock_fd);
    	return -1;
    }

    return mqtt_sock_fd;
}

void close_mqtt_connection(int mqtt_sock_fd) {
    printf("Closing MQTT transport\n");
    transport_close(mqtt_sock_fd);
}

int work_mac_events(int mqtt_sock_fd, void *zmq_sock,
    struct mac_events_subscription subs,
    mqtt_mac_handler handlers[EVENT_TYPES_SIZE],
    char *mqtt_topic, char *mqtt_info_topic,
    int mqtt_qos, struct alias_item **aliases)
{
 
    int rc;
    unsigned char payload[PAYLOAD_SIZE];
    unsigned char buffer[BUFFER_SIZE];
    int buf_len = sizeof(buffer);
    char infoMessage[512];
    char eventType[128];

    //mqtt paremeters
    int retained = 0; 
    MQTTString topicString = MQTTString_initializer;
    MQTTString infoTopicString = MQTTString_initializer;

    // messages
    zmq_msg_t msg;
    mac_event_t *me;
    // iteraing variables
    double now_ms;
    unsigned type;
    unsigned sequence;

    int message_len = 0;
    int send_message = 0;
    int len = 0;
    int copy_ok = 1;
    int info_topic_defined = 0;
    int send_counter;

    // zmq msg init
    rc = zmq_msg_init(&msg);
    if (rc != 0) {
        printf("zmq_msg_init: %s\n", zmq_strerror(errno));
        return -1;
    }

    now_ms = currentTime_ms();

    topicString.cstring = mqtt_topic;
    infoTopicString.cstring = mqtt_info_topic;

    info_topic_defined = strlen(mqtt_info_topic) > 0;
    int fail_to_send = 0;

    while (run) {
        int printOffset=0; 
        // int temp = 0; //delete

        rc = zmq_msg_recv(&msg, zmq_sock, 0);

        // Okay, got a binary packet
        if (run && rc < 0) {
            log_err("zmq_msg_recv: %s", zmq_strerror(errno));
            break;
        }

        me = (mac_event_t *)(zmq_msg_data(&msg));
        type = me->base.type;
        sequence = me->base.seqNum;

        now_ms = currentTime_ms();
        send_message = 0;

        if (type == MAC_EVENTTYPE_HEALTH && subs.columns_specs[MAC_EVENTTYPE_HEALTH] != 0) {
            message_len = handlers[MAC_EVENTTYPE_HEALTH](me, subs, now_ms, (char *)payload, 
                &printOffset, &send_message, &copy_ok, &*aliases);
        } else if(type ==  MAC_EVENTTYPE_ROUND_START && subs.columns_specs[MAC_EVENTTYPE_ROUND_START] != 0) {
            message_len = handlers[MAC_EVENTTYPE_ROUND_START](me, subs, now_ms, (char *)payload, 
                &printOffset, &send_message, &copy_ok, &*aliases);
        } else if (type == MAC_EVENTTYPE_RN16_DATA && subs.columns_specs[MAC_EVENTTYPE_RN16_DATA] !=0) {
            message_len = handlers[MAC_EVENTTYPE_RN16_DATA](me, subs, now_ms, (char *)payload, 
                &printOffset, &send_message, &copy_ok, &*aliases);
        } else if (type == MAC_EVENTTYPE_TAG_READ_DATA && subs.columns_specs[MAC_EVENTTYPE_TAG_READ_DATA] != 0) {
            message_len = handlers[MAC_EVENTTYPE_TAG_READ_DATA](me, subs, now_ms, (char *)payload, 
                &printOffset, &send_message, &copy_ok, &*aliases);
        } else if (type == MAC_EVENTTYPE_READ_REPLY_DATA && subs.columns_specs[MAC_EVENTTYPE_READ_REPLY_DATA]) {
            message_len = handlers[MAC_EVENTTYPE_READ_REPLY_DATA](me, subs, now_ms, (char *)payload, 
                &printOffset, &send_message, &copy_ok, &*aliases);
        } else if(type == MAC_EVENTTYPE_ACCESS_STATUS && subs.columns_specs[MAC_EVENTTYPE_ACCESS_STATUS] !=0) {
            message_len = handlers[MAC_EVENTTYPE_ACCESS_STATUS](me, subs, now_ms, (char *)payload, 
                &printOffset, &send_message, &copy_ok, &*aliases);
        } else if (type == MAC_EVENTTYPE_SENSOR_DATA && subs.columns_specs[MAC_EVENTTYPE_SENSOR_DATA] !=0) {
            message_len = handlers[MAC_EVENTTYPE_SENSOR_DATA](me, subs, now_ms, (char *)payload, 
                &printOffset, &send_message, &copy_ok, &*aliases);
        } else if (type == MAC_EVENTTYPE_SENSOR_HEALTH && subs.columns_specs[MAC_EVENTTYPE_SENSOR_HEALTH]) {
            message_len = handlers[MAC_EVENTTYPE_SENSOR_HEALTH](me, subs, now_ms, (char *)payload, 
                &printOffset, &send_message, &copy_ok, &*aliases);
        }   

        if(run && send_message) {
            len = MQTTSerialize_publish(buffer, buf_len, 0, mqtt_qos, retained, sseID, topicString, payload, message_len);
            rc = 0;
            send_counter = 0;
            while(len > 0) {
                rc = transport_sendPacketBuffer(mqtt_sock_fd, buffer + rc, len);

                if(rc < 0) {
                    // log_err("Unable to send message: %s", payload);
                    printf("Unable to send message of %d bytes. Failed to write in socket\n", len);
                    fail_to_send = 1;
                    break;
                }

                len = len - rc;
                send_counter++;
            }

            if(info_topic_defined && send_counter > 2 ) {
                strcpy(eventType, getEventTypeString(type));
                printf("Too many retries when sending mqtt messages. It may mean network connection is slow or is congested. \n");
                sprintf(infoMessage,"{\"level\": \"error\", \"msg\": \"Too many retries when sending mqtt messages. It may mean network connection is slow or is congested. Event type: %s. sseID: %u.\"}", eventType, sseID);
                len = MQTTSerialize_publish(buffer, buf_len, 0, mqtt_qos, retained, sseID, infoTopicString, (unsigned char*)infoMessage, strlen(infoMessage));
                rc = transport_sendPacketBuffer(mqtt_sock_fd, buffer, len);
                if(rc < 0) {
                    //log_err("Unable to send message: %s", infoMessage);
                    printf("Too many retries when sending mqtt messages. It may mean network connection is slow or is congested. \n");
                    break;
                }
            }

            if(info_topic_defined && !copy_ok) {
                strcpy(eventType, getEventTypeString(type));
                printf("Max events per packet reached for %s \n",eventType);
                sprintf(infoMessage,"{\"level\": \"error\", \"msg\": \"Max events per packet reached for %s. sseID: %u.\"}", eventType, sseID);
                len = MQTTSerialize_publish(buffer, buf_len, 0, mqtt_qos, retained, sseID, infoTopicString, (unsigned char*)infoMessage, strlen(infoMessage));
                rc = transport_sendPacketBuffer(mqtt_sock_fd, buffer, len);
                if(rc < 0) {
                    //log_err("Unable to send message: %s", infoMessage);
                    printf("Unable to send message: %s. Failed to write error Message ERROR: Max events per pack reached.\n", infoMessage);
                    break;
                }
            }
            if(fail_to_send){
                break;
            }
            sseID++;
        }
    }

    rc = zmq_msg_close(&msg);

    if (rc != 0) {
        log_err("zmq_msg_close: %s", zmq_strerror(errno));
        return -1;
    }

    return 1;
}

void  INThandler(int sig)
{
     signal(sig, SIG_IGN);
     run = 0;
     printf("\nExiting.\n");
}

int main(int argc, char **argv) {
	struct opts_struct opts =  {
	    "", MQTT_DEFAULT_PORT, "", "", 
	    MQTT_DEFAULT_QOS, "", "", ""
	};

	getopts(argc, argv, &opts);

	printf("Host: %s\n", opts.host);
	printf("Port: %d\n", opts.port);
	printf("Subscription: %s\n", opts.subscription);
	printf("Topic: %s\n", opts.topic);
	printf("QOS: %d\n", opts.qos);
	printf("ClientId: %s\n", opts.clientid);
	printf("Username: %s\n", opts.username);
	printf("Password: %s\n", opts.password);
    printf("InfoTopic: %s\n", opts.info_topic);

	int rc;
	void *zmq_context;
	void *zmq_sock;
	int mqtt_sock_fd = 0;
	struct mac_events_subscription subs;
    mqtt_mac_handler handlers[EVENT_TYPES_SIZE];

    mqtt_handlers_init_defaults();

    signal(SIGINT, INThandler);
    signal(SIGPIPE, SIG_IGN);

	if(load_subscription(opts.subscription, &subs) < 0)
    {
        log_err("Subscription not found.");
        return 0;
    }

    mqtt_handler_init_handlers(subs, handlers);

    // Decorate SSE stream to include 'alias'
    char response[4096];
    uri_request_GET("127.0.0.1", 80, "/apps/config/antennaAliases", response);
    printf("Response = %s\n", response);
    struct alias_item *aliases = NULL;  // to decorate alias in SSE stream
    create_alias_map(response, &aliases);

	rc = open_zmqbus_connection(&zmq_context, &zmq_sock, BIND_MACEVENT);
	if(rc < 0) {
        destroy_alias_map(&aliases);
        return -1;
	}

    while(run) {
        mqtt_sock_fd = open_mqtt_connection(MQTT_VERSION, opts.host, opts.port, opts.clientid, opts.username, opts.password);
 
        if(mqtt_sock_fd > 0) {
            printf("Sending data to MQTT broker...\n");
            work_mac_events(mqtt_sock_fd, zmq_sock, subs, handlers, 
                opts.topic, opts.info_topic, opts.qos, &aliases);
        }

        if(run) {
            printf("Will try to re-connect in 5 seconds.\n");
            usleep(5000000);    
        }
    }
    close_mqtt_connection(mqtt_sock_fd);
    zmq_close(zmq_sock);
	close_zqmbus_connection(&zmq_context, &zmq_sock);
    destroy_alias_map(&aliases);
 	return 0;
}
