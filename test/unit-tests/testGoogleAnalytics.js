describe('Analytics Framework GA Plugin Unit Tests', function() {
  jest.autoMockOff();
  //this file is the file that defines TEST_ROOT and SRC_ROOT
  require("../unit-test-helpers/test_env.js");
  require("../unit-test-helpers/mock_ga.js");
  require(SRC_ROOT + "framework/AnalyticsFramework.js");
//  require(SRC_ROOT + "plugins/AnalyticsPluginTemplate.js");
  require(TEST_ROOT + "unit-test-helpers/AnalyticsFrameworkTestUtils.js");
  require(COMMON_SRC_ROOT + "utils/InitModules/InitOOUnderscore.js");

  var Analytics = OO.Analytics;
  var Utils = OO.Analytics.Utils;
  var _ = OO._;
  var framework;

  var playerName = "Ooyala V4";

  var COMMAND = {
    SEND: "send"
  };

  var HIT_TYPE = {
    EVENT: "event"
  };

  //custom values defined by us in the plugin
  var EVENT_CATEGORY = {
    OOYALA: "Ooyala"
  };

  var EVENT_ACTION = {
    PLAYBACK_STARTED: "playbackStarted",
    PLAYBACK_PAUSED: "playbackPaused",
    CONTENT_READY: "contentReady",
    PLAY_PROGRESS_STARTED: "playProgressStarted",
    PLAY_PROGRESS_QUARTER: "playProgressQuarter",
    PLAY_PROGRESS_HALF: "playProgressHalf",
    PLAY_PROGRESS_THREE_QUARTERS: "playProgressThreeQuarters",
    PLAY_PROGRESS_END: "playProgressEnd",
    AD_PLAYBACK_STARTED: "adPlaybackStarted",
    AD_PLAYBACK_FINISHED: "adPlaybackFinished"
  };

  //setup for individual tests
  var testSetup = function() {
    framework = new Analytics.Framework();
    //mute the logging becuase there will be lots of error messages
    // OO.log = function() {
    // };
  };

  //cleanup for individual tests
  var testCleanup = function() {
    OO.Analytics.PluginFactoryList = [];
    OO.Analytics.FrameworkInstanceList = [];
    resetMockGa();
    //return log back to normal
    //OO.log = console.log;
  };

  beforeEach(testSetup);
  afterEach(testCleanup);

  //helpers
  var createPlugin = function(framework, metadata)
  {
    var gaPluginFactory = require(SRC_ROOT + "plugins/ga.js");
    var plugin = new gaPluginFactory(framework);
    plugin.init();
    metadata = {};
    plugin.setMetadata(metadata);
    return plugin;
  };

  var checkGaArgumentsForEvent = function(eventAction, eventLabel)
  {
    //command, hit type
    expect(MockGa.gaCommand).toBe(COMMAND.SEND);
    expect(MockGa.gaArguments[1]).toBe(HIT_TYPE.EVENT);
    //eventCategory, eventAction, eventLabel, eventValue
    expect(MockGa.gaArguments[2]).toBe(EVENT_CATEGORY.OOYALA);
    expect(MockGa.gaArguments[3]).toBe(eventAction);
    //GA plugin uses title as the event label
    expect(MockGa.gaArguments[4]).toBe(eventLabel);
  };

  it('GA sends contentReady event when player is loaded', function() {
    var plugin = createPlugin(framework);
    var simulator = Utils.createPlaybackSimulator(plugin);
    simulator.simulatePlayerLoad({
      embedCode: "testEmbedCode",
      title: "testTitle",
      duration: 60000
    });
    simulator.simulateStreamMetadataUpdated();
    checkGaArgumentsForEvent(EVENT_ACTION.CONTENT_READY, "testTitle");
  });

  it('GA sends playbackStarted event when content starts', function() {
    var plugin = createPlugin(framework);
    var simulator = Utils.createPlaybackSimulator(plugin);
    simulator.simulatePlayerLoad({
      embedCode: "testEmbedCode",
      title: "testTitle",
      duration: 60000
    });
    simulator.simulateStreamMetadataUpdated();
    simulator.simulateContentPlayback();

    checkGaArgumentsForEvent(EVENT_ACTION.PLAYBACK_STARTED, "testTitle");
  });

  it('GA sends playbackPaused event when content is paused after starting', function() {
    var plugin = createPlugin(framework);
    var simulator = Utils.createPlaybackSimulator(plugin);
    simulator.simulatePlayerLoad({
      embedCode: "testEmbedCode",
      title: "testTitle",
      duration: 60000
    });
    simulator.simulateStreamMetadataUpdated();
    simulator.simulateContentPlayback();
    simulator.simulateVideoProgress({
      playheads: [0, 1],
      totalStreamDuration: 60
    });

    simulator.simulateVideoPause();

    checkGaArgumentsForEvent(EVENT_ACTION.PLAYBACK_PAUSED, "testTitle");
  });

  //Works around a limitation where a pause event is fired when content starts
  it('GA does not send playbackPaused event when content is paused before starting', function() {
    var plugin = createPlugin(framework);
    var simulator = Utils.createPlaybackSimulator(plugin);
    simulator.simulatePlayerLoad({
      embedCode: "testEmbedCode",
      title: "testTitle",
      duration: 60000
    });
    simulator.simulateStreamMetadataUpdated();
    simulator.simulateContentPlayback();

    resetMockGa();

    simulator.simulateVideoPause();

    expect(MockGa.gaCommand).toBe(null);
  });

  //Works around a limitation where a pause event is fired when content finishes
  it('GA does not send playbackPaused event when content is paused after finishing', function() {
    var plugin = createPlugin(framework);
    var simulator = Utils.createPlaybackSimulator(plugin);
    simulator.simulatePlayerLoad({
      embedCode: "testEmbedCode",
      title: "testTitle",
      duration: 60000
    });
    simulator.simulateStreamMetadataUpdated();
    simulator.simulateContentPlayback();

    simulator.simulateVideoProgress({
      playheads: [0, 1, 15, 16, 60],
      totalStreamDuration: 60
    });

    simulator.simulatePlaybackComplete();

    resetMockGa();

    simulator.simulateVideoPause();

    expect(MockGa.gaCommand).toBe(null);
  });

  it('GA sends playback milestone for playProgressStarted', function() {
    var plugin = createPlugin(framework);
    var simulator = Utils.createPlaybackSimulator(plugin);
    simulator.simulatePlayerLoad({
      embedCode: "testEmbedCode",
      title: "testTitle",
      duration: 60000
    });
    simulator.simulateStreamMetadataUpdated();
    simulator.simulateContentPlayback();
    simulator.simulateVideoProgress({
      playheads: [0, 1],
      totalStreamDuration: 60
    });

    checkGaArgumentsForEvent(EVENT_ACTION.PLAY_PROGRESS_STARTED, "testTitle");
  });

  it('GA sends playback milestone for playProgressQuarter', function() {
    var plugin = createPlugin(framework);
    var simulator = Utils.createPlaybackSimulator(plugin);
    simulator.simulatePlayerLoad({
      embedCode: "testEmbedCode",
      title: "testTitle",
      duration: 60000
    });
    simulator.simulateStreamMetadataUpdated();
    simulator.simulateContentPlayback();
    //TODO: Currently we need to get past the milestone to trigger the event
    //Playheads equal to the milestone will not trigger the event
    simulator.simulateVideoProgress({
      playheads: [0, 1, 15, 16],
      totalStreamDuration: 60
    });

    checkGaArgumentsForEvent(EVENT_ACTION.PLAY_PROGRESS_QUARTER, "testTitle");
  });

  it('GA will not send playback milestone for playProgressQuarter again if meeting the same milestone again in the same playback', function() {
    var plugin = createPlugin(framework);
    var simulator = Utils.createPlaybackSimulator(plugin);
    simulator.simulatePlayerLoad({
      embedCode: "testEmbedCode",
      title: "testTitle",
      duration: 60000
    });
    simulator.simulateStreamMetadataUpdated();
    simulator.simulateContentPlayback();
    //TODO: Currently we need to get past the milestone to trigger the event
    //Playheads equal to the milestone will not trigger the event
    simulator.simulateVideoProgress({
      playheads: [0, 1, 15, 16],
      totalStreamDuration: 60
    });

    checkGaArgumentsForEvent(EVENT_ACTION.PLAY_PROGRESS_QUARTER, "testTitle");

    resetMockGa();

    expect(MockGa.gaCommand).toBe(null);

    simulator.simulateVideoProgress({
      playheads: [20],
      totalStreamDuration: 60
    });

    expect(MockGa.gaCommand).toBe(null);

    simulator.simulateVideoSeek();

    simulator.simulateVideoProgress({
      playheads: [5, 10, 15, 16],
      totalStreamDuration: 60
    });

    expect(MockGa.gaCommand).toBe(null);
  });

  it('GA sends playback milestone for playProgressHalf', function() {
    var plugin = createPlugin(framework);
    var simulator = Utils.createPlaybackSimulator(plugin);
    simulator.simulatePlayerLoad({
      embedCode: "testEmbedCode",
      title: "testTitle",
      duration: 60000
    });
    simulator.simulateStreamMetadataUpdated();
    simulator.simulateContentPlayback();
    //TODO: Currently we need to get past the milestone to trigger the event
    //Playheads equal to the milestone will not trigger the event
    simulator.simulateVideoProgress({
      playheads: [0, 1, 15, 16, 20, 25, 30, 31],
      totalStreamDuration: 60
    });

    checkGaArgumentsForEvent(EVENT_ACTION.PLAY_PROGRESS_HALF, "testTitle");
  });

  it('GA will not send playback milestone for playProgressHalf again if meeting the same milestone again in the same playback', function() {
    var plugin = createPlugin(framework);
    var simulator = Utils.createPlaybackSimulator(plugin);
    simulator.simulatePlayerLoad({
      embedCode: "testEmbedCode",
      title: "testTitle",
      duration: 60000
    });
    simulator.simulateStreamMetadataUpdated();
    simulator.simulateContentPlayback();
    //TODO: Currently we need to get past the milestone to trigger the event
    //Playheads equal to the milestone will not trigger the event
    simulator.simulateVideoProgress({
      playheads: [0, 1, 15, 16, 20, 25, 30, 31],
      totalStreamDuration: 60
    });

    checkGaArgumentsForEvent(EVENT_ACTION.PLAY_PROGRESS_HALF, "testTitle");

    resetMockGa();

    expect(MockGa.gaCommand).toBe(null);

    simulator.simulateVideoProgress({
      playheads: [35],
      totalStreamDuration: 60
    });

    expect(MockGa.gaCommand).toBe(null);

    simulator.simulateVideoSeek();

    simulator.simulateVideoProgress({
      playheads: [5, 10, 15, 16, 20, 30, 31],
      totalStreamDuration: 60
    });

    expect(MockGa.gaCommand).toBe(null);
  });

  it('GA sends playback milestone for playProgressThreeQuarters', function() {
    var plugin = createPlugin(framework);
    var simulator = Utils.createPlaybackSimulator(plugin);
    simulator.simulatePlayerLoad({
      embedCode: "testEmbedCode",
      title: "testTitle",
      duration: 60000
    });
    simulator.simulateStreamMetadataUpdated();
    simulator.simulateContentPlayback();
    //TODO: Currently we need to get past the milestone to trigger the event
    //Playheads equal to the milestone will not trigger the event
    simulator.simulateVideoProgress({
      playheads: [0, 1, 15, 16, 20, 25, 30, 31, 39, 45, 46],
      totalStreamDuration: 60
    });

    checkGaArgumentsForEvent(EVENT_ACTION.PLAY_PROGRESS_THREE_QUARTERS, "testTitle");
  });

  it('GA will not send playback milestone for playProgressThreeQuarters again if meeting the same milestone again in the same playback', function() {
    var plugin = createPlugin(framework);
    var simulator = Utils.createPlaybackSimulator(plugin);
    simulator.simulatePlayerLoad({
      embedCode: "testEmbedCode",
      title: "testTitle",
      duration: 60000
    });
    simulator.simulateStreamMetadataUpdated();
    simulator.simulateContentPlayback();
    //TODO: Currently we need to get past the milestone to trigger the event
    //Playheads equal to the milestone will not trigger the event
    simulator.simulateVideoProgress({
      playheads: [0, 1, 15, 16, 20, 25, 30, 31, 39, 45, 46],
      totalStreamDuration: 60
    });

    checkGaArgumentsForEvent(EVENT_ACTION.PLAY_PROGRESS_THREE_QUARTERS, "testTitle");

    resetMockGa();

    expect(MockGa.gaCommand).toBe(null);

    simulator.simulateVideoProgress({
      playheads: [35],
      totalStreamDuration: 60
    });

    expect(MockGa.gaCommand).toBe(null);

    simulator.simulateVideoSeek();

    simulator.simulateVideoProgress({
      playheads: [5, 10, 15, 16, 20, 30, 31, 40, 45, 46],
      totalStreamDuration: 60
    });

    expect(MockGa.gaCommand).toBe(null);
  });

  it('GA sends playback milestone for playProgressEnd', function() {
    var plugin = createPlugin(framework);
    var simulator = Utils.createPlaybackSimulator(plugin);
    simulator.simulatePlayerLoad({
      embedCode: "testEmbedCode",
      title: "testTitle",
      duration: 60000
    });
    simulator.simulateStreamMetadataUpdated();
    simulator.simulateContentPlayback();
    //TODO: Currently we need to get past the milestone to trigger the event
    //Playheads equal to the milestone will not trigger the event
    simulator.simulateVideoProgress({
      playheads: [0, 1, 15, 16, 20, 25, 30, 31, 39, 45, 46, 59, 60],
      totalStreamDuration: 60
    });

    checkGaArgumentsForEvent(EVENT_ACTION.PLAY_PROGRESS_END, "testTitle");
  });

  //ADS
  it('GA sends adPlaybackStarted when an ad starts', function() {
    var plugin = createPlugin(framework);
    var simulator = Utils.createPlaybackSimulator(plugin);
    simulator.simulatePlayerLoad({
      embedCode: "testEmbedCode",
      title: "testTitle",
      duration: 60000
    });
    simulator.simulateStreamMetadataUpdated();
    simulator.simulateContentPlayback();
    simulator.simulateVideoProgress({
      playheads: [0, 1, 15],
      totalStreamDuration: 60
    });

    simulator.simulateAdBreakStarted();

    checkGaArgumentsForEvent(EVENT_ACTION.AD_PLAYBACK_STARTED, "testTitle");
  });

  // it('GA sends adPlaybackFinished when an ad ends', function() {
  //   var plugin = createPlugin(framework);
  //   var simulator = Utils.createPlaybackSimulator(plugin);
  //   simulator.simulatePlayerLoad({
  //     embedCode: "testEmbedCode",
  //     title: "testTitle",
  //     duration: 60000
  //   });
  //   simulator.simulateStreamMetadataUpdated();
  //   simulator.simulateContentPlayback();
  //   simulator.simulateVideoProgress({
  //     playheads: [0, 1, 15],
  //     totalStreamDuration: 60
  //   });
  //
  //   simulator.simulateAdBreakStarted();
  //   simulator.simulateAdBreakEnded();
  //
  //   checkGaArgumentsForEvent(EVENT_ACTION.AD_PLAYBACK_FINISHED, "testTitle");
  // });
});