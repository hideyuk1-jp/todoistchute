$(function () {
  //置き換え
  $("[data-i18n]").each(function () {
    var t = $(this);
    if (t.prop("tagName") == "INPUT") {
      t.val(chrome.i18n.getMessage(t.data("i18n")));
    } else {
      t.text(chrome.i18n.getMessage(t.data("i18n")));
    }
  });

  var tc_options = {
    tc_begintime: "09:00",
    tc_breaktime: "1",
    tc_linkicon: "false",
    tc_taskbar: "true",
    tc_calender: "false",
    tc_todoist_api_token: "",
    tc_calender_accent: "false",
    tc_calender_accent_min_time: "10",
    tc_calender_priority_tasks: "false",
    tc_calender_p1: "true",
    tc_calender_p2: "true",
    tc_calender_p3: "true",
    tc_calender_p4: "true",
    tc_calender_untimed_tasks: "false",
  };

  //セーブボタンが押されたら、chrome.storageに保存
  $("#save").click(function () {
    tc_options.tc_begintime = $("input[name=begintime]").val();
    tc_options.tc_breaktime = $("input[name=breaktime]").val();
    if ($("input[name=linkicon_checkbox]").prop("checked")) {
      tc_options.tc_linkicon = "true";
    } else {
      tc_options.tc_linkicon = "false";
    }
    if ($("input[name=taskbar_checkbox]").prop("checked")) {
      tc_options.tc_taskbar = "true";
    } else {
      tc_options.tc_taskbar = "false";
    }
    if ($("input[name=calender_checkbox]").prop("checked")) {
      tc_options.tc_calender = "true";
    } else {
      tc_options.tc_calender = "false";
    }
    if ($("input[name=calender_accent_checkbox]").prop("checked")) {
      tc_options.tc_calender_accent = "true";
    } else {
      tc_options.tc_calender_accent = "false";
    }
    tc_options.tc_calender_accent_min_time = $(
      "input[name=accent_min_time]"
    ).val();
    tc_options.tc_todoist_api_token = $("input[name=todoist_api_token]").val();
    if ($("input[name=calender_priority_tasks_checkbox]").prop("checked")) {
      tc_options.tc_calender_priority_tasks = "true";
    } else {
      tc_options.tc_calender_priority_tasks = "false";
    }
    if ($("input[name=calender_p1_checkbox]").prop("checked")) {
      tc_options.tc_calender_p1 = "true";
    } else {
      tc_options.tc_calender_p1 = "false";
    }
    if ($("input[name=calender_p2_checkbox]").prop("checked")) {
      tc_options.tc_calender_p2 = "true";
    } else {
      tc_options.tc_calender_p2 = "false";
    }
    if ($("input[name=calender_p3_checkbox]").prop("checked")) {
      tc_options.tc_calender_p3 = "true";
    } else {
      tc_options.tc_calender_p3 = "false";
    }
    if ($("input[name=calender_p4_checkbox]").prop("checked")) {
      tc_options.tc_calender_p4 = "true";
    } else {
      tc_options.tc_calender_p4 = "false";
    }
    if ($("input[name=calender_untimed_tasks_checkbox]").prop("checked")) {
      tc_options.tc_calender_untimed_tasks = "true";
    } else {
      tc_options.tc_calender_untimed_tasks = "false";
    }

    chrome.storage.sync.set(tc_options, function () {});
  });

  //オプション画面の初期値を設定
  chrome.storage.sync.get(tc_options, function (options) {
    //休憩時間がhh:mm形式の場合
    var brtime = options.tc_breaktime.match(
      /^(0?[0-9]|1[0-9]|2[0-4]):(0?[0-9]|[1-5][0-9])$/
    );
    if (brtime)
      options.tc_breaktime =
        Math.round((parseFloat(brtime[1]) + parseFloat(brtime[2]) / 60) * 100) /
        100;

    if (options.tc_begintime)
      $("input[name=begintime]").val([options.tc_begintime]);
    if (options.tc_breaktime)
      $("input[name=breaktime]").val([options.tc_breaktime]);
    if (options.tc_linkicon == "true") {
      $("input[name=linkicon_checkbox]").prop("checked", true);
    } else {
      $("input[name=linkicon_checkbox]").prop("checked", false);
    }
    if (options.tc_taskbar == "true") {
      $("input[name=taskbar_checkbox]").prop("checked", true);
    } else {
      $("input[name=taskbar_checkbox]").prop("checked", false);
    }
    if (options.tc_calender == "true") {
      $("input[name=calender_checkbox]").prop("checked", true);
    } else {
      $("input[name=calender_checkbox]").prop("checked", false);
    }
    if (options.tc_calender_accent == "true") {
      $("input[name=calender_accent_checkbox]").prop("checked", true);
    } else {
      $("input[name=calender_accent_checkbox]").prop("checked", false);
    }
    if (options.tc_calender_accent_min_time)
      $("input[name=accent_min_time]").val([
        options.tc_calender_accent_min_time,
      ]);
    if (options.tc_todoist_api_token)
      $("input[name=todoist_api_token]").val([options.tc_todoist_api_token]);
    if (options.tc_calender_priority_tasks == "true") {
      $("input[name=calender_priority_tasks_checkbox]").prop("checked", true);
    } else {
      $("input[name=calender_priority_tasks_checkbox]").prop("checked", false);
    }
    if (options.tc_calender_p1 == "true") {
      $("input[name=calender_p1_checkbox]").prop("checked", true);
    } else {
      $("input[name=calender_p1_checkbox]").prop("checked", false);
    }
    if (options.tc_calender_p2 == "true") {
      $("input[name=calender_p2_checkbox]").prop("checked", true);
    } else {
      $("input[name=calender_p2_checkbox]").prop("checked", false);
    }
    if (options.tc_calender_p3 == "true") {
      $("input[name=calender_p3_checkbox]").prop("checked", true);
    } else {
      $("input[name=calender_p3_checkbox]").prop("checked", false);
    }
    if (options.tc_calender_p4 == "true") {
      $("input[name=calender_p4_checkbox]").prop("checked", true);
    } else {
      $("input[name=calender_p4_checkbox]").prop("checked", false);
    }
    if (options.tc_calender_untimed_tasks == "true") {
      $("input[name=calender_untimed_tasks_checkbox]").prop("checked", true);
    } else {
      $("input[name=calender_untimed_tasks_checkbox]").prop("checked", false);
    }
  });
});
