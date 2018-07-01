$(function(){
  var tc_options = {
    tc_countMode: "auto",
    tc_begintime: "09:00",
    tc_breaktime: "01:00"
  };

  //セーブボタンが押されたら、chrome.storageに保存
  $("#save").click(function () {
    tc_options.tc_countMode = $('input[name=countMode]:checked').val();
    tc_options.tc_begintime = $('input[name=begintime]').val();
    tc_options.tc_breaktime = $('input[name=breaktime]').val();
    chrome.storage.sync.set(tc_options, function(){});
  });

  //オプション画面の初期値を設定
  chrome.storage.sync.get(
    tc_options,
    function(options) {
      if (options.tc_countMode) $('input[name=countMode]').val([options.tc_countMode]);
      if (options.tc_begintime) $('input[name=begintime]').val([options.tc_begintime]);
      if (options.tc_breaktime) $('input[name=breaktime]').val([options.tc_breaktime]);
    }
  );
});
