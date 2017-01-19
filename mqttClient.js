

var context = {
    // brocker info,
    host: null,
    port: null,
    // client
    client: null,
    // loggers
    logSSE: null,
    logger: null,
    // topics
    reqTopic: null,
    respTopic: null,
    dataTopic: null,
    sseTopic: null,
    uploads: {},
    restorer : null
}

module.exports.useStatusRestorer = function (statusRestorer) {
    context.restorer = statusRestorer;
    context.logger.info("context:  " +  context.restorer)
    context.restorer.update()
}

module.exports.useLogger = function (logger) {
    context.logger = logger;
}