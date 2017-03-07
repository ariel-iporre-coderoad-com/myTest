'use strict';

angular.module('microStar')
  .controller('RecoveryOptionsCtrl',RecoveryOptionsCtrl);

function RecoveryOptionsCtrl($scope,ngDialog,MicroStar,TagViewerSession,$rootScope,$timeout,ErrorService){
  function println(elem){
    console.log(JSON.stringify(elem,null,4));
  }
  var rcv = this;
  /** Variables */
  rcv.switch = false;
  rcv.programs = [];
  rcv.recovery = {
    programName: 'basic',
    recoveryMode: 'lastState',
    autoRecovery: false
  };
  rcv.host = '';
  rcv.mqttStatus = false;
  rcv.specificProgram = '';
  rcv.programSelector = {type : '', list:''};
  rcv.lastProgram = '';

  /** Functions */
  rcv.println = println;
  rcv.initialize = initialize;
  rcv.starListenEvents = starListenEvents;
  rcv.checkIfProgramIsRunning = checkIfProgramIsRunning;
  rcv.setRecoveryConfig = setRecoveryConfig;
  rcv.setMqttHostAndPort = setMqttHostAndPort;
  rcv.setSpecificProgramValues = setSpecificProgramValues;
  rcv.setLastRunningProgramValues = setLastRunningProgramValues;
  rcv.setProgramIsRunning = setProgramIsRunning;
  rcv.isSpecificProgramSelected = isSpecificProgramSelected;
  rcv.selectSpecificProgram = selectSpecificProgram;
  rcv.openProgramSelector = openProgramSelector;
  rcv.getPrograms = getPrograms;
  rcv.selectProgram = selectProgram;
  rcv.closeProgramSelector = closeProgramSelector;
  rcv.saveRecoverConfig = saveRecoverConfig;
  rcv.onChangeRecoverySwitch = onChangeRecoverySwitch;
  rcv.setCurrentRunningProgramLast = setCurrentRunningProgramLast;


  function initialize(){
    rcv.globalApp.innerLoadingOn();
    rcv.starListenEvents();
    rcv.checkIfProgramIsRunning();
    rcv.setRecoveryConfig().then(function(){
      return rcv.setMqttHostAndPort();
    }).then(function(){
      rcv.globalApp.innerLoadingOff();
    })
    .catch(function(e){
      console.log('An unexpected error occurred in Recovery: ');
      console.log(e);
      rcv.globalApp.innerLoadingOff();
    })
  }

  /** Initialize*/
  function starListenEvents () {
    $scope.$on('tagViewer:changeStatus', function (event, status) {
      if (status === 'running') {
        rcv.setProgramIsRunning();
      } else if (status === 'stopped') {
        rcv.programIsRunning.status = false;
      }
    });
  }

  function checkIfProgramIsRunning(){
    if(TagViewerSession.isRunning()){
      rcv.setProgramIsRunning();
    }
  }

  function setProgramIsRunning(){
    var prog = TagViewerSession.getActiveProgram();
    rcv.programIsRunning.status = true;
    rcv.programIsRunning.programName = prog;
  }

  function setRecoveryConfig(){
    return MicroStar.recoveryOptions().get().then(function(response){
      var data = response.data.plain();
      rcv.recovery = data;
      rcv.mqttStatus = data.mqttSendingData ? data.mqttSendingData:false;
      if(data.recoveryMode==='fixedState'){
        rcv.specificProgram=data.programName;
      }
      else{
        rcv.lastProgram = data.programName;
      }
      return true;
    })
  }

  function setMqttHostAndPort(){
    MicroStar.mqtt().get().then(function(response){
      var data = response.data.plain();
      $scope.broker = data.mqtt_host;
      $scope.port = data.mqtt_port;
      rcv.host = data.mqtt_host+':'+data.mqtt_port;
      if(!data.mqtt_host || !data.mqtt_port){
        rcv.host='';
      }
      return true;
    })
  }

  /** --- Specific Progam Selector Button ---*/

  function selectSpecificProgram(){
    if(rcv.specificProgram===''){
      rcv.openProgramSelector();
    }
    else{
      rcv.setCurrentRunningProgramLast()
    }
  }

  //Open
  function openProgramSelector(){
    rcv.getPrograms();
    rcv.dialog = ngDialog.open({
      disableAnimation: true,
      closeByDocument: true,
      showClose: true,
      template: 'components/advanced/control/recoveryOptions/selectPrograms.modal.html',
      scope: $scope
    });
  }

  function getPrograms(){
    MicroStar.programs().getList().then(function(response) {
      rcv.programs = [];
      _.each(response.data, function (item) {
        if (item !== 'basic') {
          rcv.programs.push(item);
        }
      });
    });
  }

  function selectProgram(program){
    rcv.specificProgram = program;
    rcv.setSpecificProgramValues();
  }

  function setSpecificProgramValues(){
    rcv.recovery.programName = rcv.specificProgram;
    rcv.recovery.programRunning = true;
    if(rcv.isSpecificProgramSelected()){
      rcv.recovery.recoveryMode = 'fixedState';
    }
    rcv.saveRecoverConfig();
  }

  function isSpecificProgramSelected(){
    return rcv.specificProgram!=='';
  }

  //Close

  function setLastRunningProgramValues(){
    rcv.specificProgram='';
    rcv.recovery.programName = rcv.lastProgram;
    rcv.recovery.recoveryMode = 'lastState';
    rcv.recovery.programRunning = rcv.programIsRunning.status;
    rcv.saveRecoverConfig();
  }

  /** General Methods - onChangeSwitch - Save */
  function closeProgramSelector (){
    rcv.dialog.close();
  }

  function onChangeRecoverySwitch(){
    rcv.recovery.autoRecovery = !rcv.recovery.autoRecovery;
    rcv.setCurrentRunningProgramLast();
    rcv.saveRecoverConfig();
  }

  function setCurrentRunningProgramLast(){
    setLastRunningProgramValues()
    if(TagViewerSession.isRunning()) {
      var prog = TagViewerSession.getActiveProgram();
      rcv.recovery.programName = prog;
      rcv.recovery.programRunning = true;
    }
  }

  function saveRecoverConfig(){
    return MicroStar.recoveryOptions().customPUT(rcv.recovery)
    .catch(function (response) {
      var errorMsg = response.data && response.data.developerMsg ? response.data.developerMsg : 'Error in the process.';
      ErrorService.show($scope, errorMsg);
    })
  }

  $rootScope.$on('previouslyRebooted', function () {
    rcv.globalApp.innerLoadingOn();
    $timeout(function(){
     rcv.setMqttHostAndPort();
     rcv.globalApp.innerLoadingOff();
    },4000);
  });

  rcv.initialize();

}
