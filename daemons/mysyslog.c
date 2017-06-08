#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/wait.h>
#include <time.h>



 long int GetTimeStamp() {
    struct timeval tp;
    gettimeofday(&tp,NULL);

    long int ms = tp.tv_sec * 1000000 + tp.tv_usec;
    return ms;
}

int main(void)
{
   int fd[2], nbytes;
   pid_t childpid;
   char string[] = "Hello, world!\n";
   char readbuffer[80];
   int now = 123125;
   int cnt = 0;
   printf("=======================================\n");
   printf("=======================================\n");
   printf("=======================================\n");
   pipe(fd);



   printf("Timestamp: %d\n",(int)time(NULL));
   /*if((childpid = fork()) == -1)
           {
                   perror("fork");
                   exit(1);
           }

   if(childpid == 0) {*/
           /* Child process closes up input side of pipe */
           //close(fd[0]);
           /* Send "string" through the output side of pipe */
           printf("===>> child");
           while(1) {
               /* Send "string" through the output side of pipe */
               if(sleep(1) == 0){
                   write(fd[1], string, (sizeof(string)+1));
                   cnt ++;
                   if(cnt % 2 == 0){
                        printf("OK==> standard out at: %ld \n",  GetTimeStamp());  
                        fflush(stdout);    
                   } else {
                        fprintf(stderr, "XX==> ) standard error at: %ld \n",  GetTimeStamp());  
                   }
                }
           }
     //      exit(0);/*
   //} else {
           /* Parent process closes up output side of pipe */
   /*        close(fd[1]);
           printf("===>> Parent");
           while(1) {
                // Send "string" through the output side of pipe 
                if(sleep(1) == 0){
                   // Read in a string from the pipe 
                   nbytes = read(fd[0], readbuffer, sizeof(readbuffer));
                   printf("Received string: %s", readbuffer);
               }
           }
   }*/

   
   
   //return(0);
}
