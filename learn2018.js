// ==UserScript==
// @icon         http://www.tsinghua.edu.cn/publish/newthu/images/favicon.ico
// @name         网络学堂2018助手
// @namespace    exhen32@live.com
// @version      2019年3月1日01版
// @description  微调排版，提醒更醒目; 支持导出日历，课程一目了然；更多功能开发中！
// @require      http://cdn.bootcss.com/jquery/3.2.1/jquery.min.js
// @require      https://cdn.bootcss.com/jqueryui/1.12.1/jquery-ui.min.js
// @author       Exhen
// @match        http*://learn2018.tsinghua.edu.cn/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      learn2018.tsinghua.edu.cn
// @updateURL    https://github.com/Exhen/learn2018helper/raw/master/learn2018.js
// @run-at       document-idle
// ==/UserScript==

var saveAs = saveAs || (function (view) {
    "use strict";
    // IE <10 is explicitly unsupported
    if (typeof view === "undefined" || typeof navigator !== "undefined" && /MSIE [1-9]\./.test(navigator.userAgent)) {
        return;
    }
    var
        doc = view.document
        // only get URL when necessary in case Blob.js hasn't overridden it yet
        , get_URL = function () {
            return view.URL || view.webkitURL || view;
        }
        , save_link = doc.createElementNS("http://www.w3.org/1999/xhtml", "a")
        , can_use_save_link = "download" in save_link
        , click = function (node) {
            var event = new MouseEvent("click");
            node.dispatchEvent(event);
        }
        , is_safari = /constructor/i.test(view.HTMLElement) || view.safari
        , is_chrome_ios = /CriOS\/[\d]+/.test(navigator.userAgent)
        , throw_outside = function (ex) {
            (view.setImmediate || view.setTimeout)(function () {
                throw ex;
            }, 0);
        }
        , force_saveable_type = "application/octet-stream"
        // the Blob API is fundamentally broken as there is no "downloadfinished" event to subscribe to
        , arbitrary_revoke_timeout = 1000 * 40 // in ms
        , revoke = function (file) {
            var revoker = function () {
                if (typeof file === "string") { // file is an object URL
                    get_URL().revokeObjectURL(file);
                } else { // file is a File
                    file.remove();
                }
            };
            setTimeout(revoker, arbitrary_revoke_timeout);
        }
        , dispatch = function (filesaver, event_types, event) {
            event_types = [].concat(event_types);
            var i = event_types.length;
            while (i--) {
                var listener = filesaver["on" + event_types[i]];
                if (typeof listener === "function") {
                    try {
                        listener.call(filesaver, event || filesaver);
                    } catch (ex) {
                        throw_outside(ex);
                    }
                }
            }
        }
        , auto_bom = function (blob) {
            // prepend BOM for UTF-8 XML and text/* types (including HTML)
            // note: your browser will automatically convert UTF-16 U+FEFF to EF BB BF
            if (/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
                return new Blob([String.fromCharCode(0xFEFF), blob], { type: blob.type });
            }
            return blob;
        }
        , FileSaver = function (blob, name, no_auto_bom) {
            if (!no_auto_bom) {
                blob = auto_bom(blob);
            }
            // First try a.download, then web filesystem, then object URLs
            var
                filesaver = this
                , type = blob.type
                , force = type === force_saveable_type
                , object_url
                , dispatch_all = function () {
                    dispatch(filesaver, "writestart progress write writeend".split(" "));
                }
                // on any filesys errors revert to saving with object URLs
                , fs_error = function () {
                    if ((is_chrome_ios || (force && is_safari)) && view.FileReader) {
                        // Safari doesn't allow downloading of blob urls
                        var reader = new FileReader();
                        reader.onloadend = function () {
                            var url = is_chrome_ios ? reader.result : reader.result.replace(/^data:[^;]*;/, 'data:attachment/file;');
                            var popup = view.open(url, '_blank');
                            if (!popup) view.location.href = url;
                            url = undefined; // release reference before dispatching
                            filesaver.readyState = filesaver.DONE;
                            dispatch_all();
                        };
                        reader.readAsDataURL(blob);
                        filesaver.readyState = filesaver.INIT;
                        return;
                    }
                    // don't create more object URLs than needed
                    if (!object_url) {
                        object_url = get_URL().createObjectURL(blob);
                    }
                    if (force) {
                        view.location.href = object_url;
                    } else {
                        var opened = view.open(object_url, "_blank");
                        if (!opened) {
                            // Apple does not allow window.open, see https://developer.apple.com/library/safari/documentation/Tools/Conceptual/SafariExtensionGuide/WorkingwithWindowsandTabs/WorkingwithWindowsandTabs.html
                            view.location.href = object_url;
                        }
                    }
                    filesaver.readyState = filesaver.DONE;
                    dispatch_all();
                    revoke(object_url);
                }
                ;
            filesaver.readyState = filesaver.INIT;

            if (can_use_save_link) {
                object_url = get_URL().createObjectURL(blob);
                setTimeout(function () {
                    save_link.href = object_url;
                    save_link.download = name;
                    click(save_link);
                    dispatch_all();
                    revoke(object_url);
                    filesaver.readyState = filesaver.DONE;
                });
                return;
            }

            fs_error();
        }
        , FS_proto = FileSaver.prototype
        , saveAs = function (blob, name, no_auto_bom) {
            return new FileSaver(blob, name || blob.name || "download", no_auto_bom);
        }
        ;
    // IE 10+ (native saveAs)
    if (typeof navigator !== "undefined" && navigator.msSaveOrOpenBlob) {
        return function (blob, name, no_auto_bom) {
            name = name || blob.name || "download";

            if (!no_auto_bom) {
                blob = auto_bom(blob);
            }
            return navigator.msSaveOrOpenBlob(blob, name);
        };
    }

    FS_proto.abort = function () { };
    FS_proto.readyState = FS_proto.INIT = 0;
    FS_proto.WRITING = 1;
    FS_proto.DONE = 2;

    FS_proto.error =
        FS_proto.onwritestart =
        FS_proto.onprogress =
        FS_proto.onwrite =
        FS_proto.onabort =
        FS_proto.onerror =
        FS_proto.onwriteend =
        null;

    return saveAs;
}(
    typeof self !== "undefined" && self
    || typeof window !== "undefined" && window
    || this.content
));
// `self` is undefined in Firefox for Android content script context
// while `this` is nsIContentFrameMessageManager
// with an attribute `content` that corresponds to the window

if (typeof module !== "undefined" && module.exports) {
    module.exports.saveAs = saveAs;
} else if ((typeof define !== "undefined" && define !== null) && (define.amd !== null)) {
    define("FileSaver.js", function () {
        return saveAs;
    });
}

var getJSON = function (url, callback) {
    GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        headers: {
            'Accept': 'application/json'
        },
        onload: function (response) {
            if (response.status >= 200 && response.status < 400) {
                callback(JSON.parse(response.responseText), url);
            } else {
                callback(false, url);
            }
        }
    });
};


function waitForKeyElements(
    selectorTxt,
    /* Required: The jQuery selector string that
                        specifies the desired element(s).
                    */
    actionFunction,
    /* Required: The code to run when elements are
                           found. It is passed a jNode to the matched
                           element.
                       */
    bWaitOnce,
    /* Optional: If false, will continue to scan for
                      new elements even after the first match is
                      found.
                  */
    iframeSelector
    /* Optional: If set, identifies the iframe to
                          search.
                      */
) {
    var targetNodes, btargetsFound;

    if (typeof iframeSelector == "undefined")
        targetNodes = jQuery(selectorTxt);
    else
        targetNodes = jQuery(iframeSelector).contents()
            .find(selectorTxt);

    if (targetNodes && targetNodes.length > 0) {
        btargetsFound = true;
        /*--- Found target node(s).  Go through each and act if they
            are new.
        */
        targetNodes.each(function () {
            var jThis = jQuery(this);
            var alreadyFound = jThis.data('alreadyFound') || false;

            if (!alreadyFound) {
                //--- Call the payload function.
                var cancelFound = actionFunction(jThis);
                if (cancelFound)
                    btargetsFound = false;
                else
                    jThis.data('alreadyFound', true);
            }
        });
    } else {
        btargetsFound = false;
    }

    //--- Get the timer-control variable for this selector.
    var controlObj = waitForKeyElements.controlObj || {};
    var controlKey = selectorTxt.replace(/[^\w]/g, "_");
    var timeControl = controlObj[controlKey];

    //--- Now set or clear the timer as appropriate.
    if (btargetsFound && bWaitOnce && timeControl) {
        //--- The only condition where we need to clear the timer.
        clearInterval(timeControl);
        delete controlObj[controlKey]
    } else {
        //--- Set a timer, if needed.
        if (!timeControl) {
            timeControl = setInterval(function () {
                waitForKeyElements(selectorTxt,
                    actionFunction,
                    bWaitOnce,
                    iframeSelector
                );
            },
                300
            );
            controlObj[controlKey] = timeControl;
        }
    }
    waitForKeyElements.controlObj = controlObj;
}


function init() {
    if (!document.getElementById("dUietC") && $('ul.stu').length) {
        var dUietC = document.createElement("a");
        dUietC.id = "dUietC";
        document.getElementsByTagName("html")[0].appendChild(dUietC);

        console.log('网络学堂2018助手 is running!')
        // 新通知数量重新排版
        $('.unsee').remove();
        $('li.clearfix').each(function () {
            $(this).css('height', '90px')
            $(this).css('padding', '8px 8px')
            if (parseInt($(this).find('span.stud').text()) > 0) {
                $(this).find('span.stud').css('font-size', '50px');
                $(this).find('span.stud').css('display', 'block');
                $(this).find('span.stud').css('padding-left', 'none');
                $(this).find('span.stud').css('text-align', 'center');
                //$(this).find('span.name').text($(this).find('span.liulan').text());
                $(this).find('span.liulan').remove();
            } else {
                $(this).find('span.stud').remove();
            }

        })
        $('ul.stu').each(function () {
            $(this).find('li').first().css('padding', '0px');
        })

        // 图片提醒
        $('dd.stu').each(function () {
            if (parseInt($(this).find('span.green').text()) > 0) {
                //var wlkcid = $(this).find('.hdtitle a').attr('href').match(/(?<=wlkcid=).*/);
                var wlkcid = $(this).find('.hdtitle a').attr('href').slice(43);
                $(this).attr('id', wlkcid)
                getJSON(`http://learn2018.tsinghua.edu.cn/b/wlxt/kczy/zy/student/index/zyListWj?wlkcid=${wlkcid}&size=99`, function (doc, url) {
                    if (doc) {
                        var ddl = 0;
                        for (var i = 0; i < doc.object.iTotalRecords; i++) {
                            if (ddl <= 0 || ddl > doc.object.aaData[i].jzsj) {
                                ddl = doc.object.aaData[i].jzsj
                            }
                        }
                        console.log(ddl)
                        var now = new Date();
                        var time = ddl - now.getTime();
                        console.log(time)
                        var days = Math.ceil(time / 86400000);
                        if (time <= 0) {
                            $(`#${wlkcid}`).find('li.clearfix').first().css('background', 'url(https://raw.githubusercontent.com/Exhen/learn2018helper/master/liangle.jpg)');
                            $(`#${wlkcid}`).find('li.clearfix').first().append(`<span style="color: red;font-size: 16px;padding:  10px 18px;line-height: 18px;width: 18px;text-align: center;display: block;float: right;">已经截至</span>`)
                        } else if (time <= 86400000) { //多于7天
                            $(`#${wlkcid}`).find('li.clearfix').first().css('background', 'url(https://raw.githubusercontent.com/Exhen/learn2018helper/master/ddl.jpg)');
                            $(`#${wlkcid}`).find('li.clearfix').first().append(`<span style="color: red;font-size: 16px;padding:  10px 18px;line-height: 18px;width: 18px;text-align: center;display: block;float: right;">最后一天</span>`)
                        } else {
                            $(`#${wlkcid}`).find('li.clearfix').first().css('background', 'url(https://raw.githubusercontent.com/Exhen/learn2018helper/master/ddl.jpg)');
                            $(`#${wlkcid}`).find('li.clearfix').first().append(`<span style="color: red;font-size: 16px;padding: 10px 18px;line-height: 18px;width: 18px;text-align: center;display: block;float: right;">还剩<span style="text-align: center;">${days}</span>天</span>`)
                        }
                        $(`#${wlkcid}`).find('p.p_img').remove();
                    }
                })
            } else {
                $(this).find('li.clearfix').first().css('background', 'url(https://raw.githubusercontent.com/Exhen/learn2018helper/master/good.jpg)');
                $(this).find('li.clearfix').first().append(`<span style="color: black;font-size: 16px;padding: 10px 18px;line-height: 18px;width: 18px;text-align: center;display: block;float: right;">没有作业</span>`)
                $(this).find('p.p_img').remove();
            }
        })

        $('head').append('<style type="text/css">.myToobar {margin: 5px;display: inline-block;background: white;border: 1px solid gray;padding: 5px;border-radius: 5px; color:black} .myToobar a {color: black}')

        // 导出日历
        $('dd.stu').each(function () {

            var calendarBtn = $('<p class="calendar_btn myToobar"><a href="javascript:void()">导出课程日历</a></p>');
            calendarBtn.click(function () {
                console.log($(this).attr('class'))
                var classTitle = $(this).parent().parent().find('a.stu').text().replace(/\(.*-.*\)/, '').trim();
                var classDesc = $(this).parent().parent().find('.stu_btn_pai span').last().attr('title');
                var classTeacher = $(this).parent().parent().find('.stu_btn span').text();
                var thisSems = $('#profile0-tab').attr('onClick').match(/\(.*-.*\)/)
                var classUntil = thisSems[0].split('-')[1] + (thisSems[0].split('-')[2] > 1 ? '0101' : '0701') + 'T000000Z';
                console.log(classDesc);
                if (classDesc && !classDesc.match('星期第0节')) {
                    for (var i = 0; i < classDesc.split(',').length; i++) {
                        var eachClass = classDesc.split(',')[i];
                        console.log(eachClass)
                        var classLocation = eachClass.split('，')[1];
                        var classTimeBegin = '', classTimeEnd = $(), classWeek = '';
                        switch (eachClass.match(/星期(.)/)[1]) {
                            case '日':
                                classWeek = 'SU';
                                break;
                            case '一':
                                classWeek = 'MO';
                                break;
                            case '二':
                                classWeek = 'TU';
                                break;
                            case '三':
                                classWeek = 'WE';
                                break;
                            case '四':
                                classWeek = 'TH';
                                break;
                            case '五':
                                classWeek = 'FR';
                                break;
                            case '六':
                                classWeek = 'SA';
                                break;
                        }
                        var now = new Date();
                        function PrefixInteger(num, length) {
                            return (Array(length).join(0) + num).slice(-length);
                        }
                        var today = PrefixInteger(now.getFullYear(), 4) + PrefixInteger(now.getMonth() + 1, 2) + PrefixInteger(now.getDate(), 2);
                        switch (eachClass.match(/第(.)节/)[1]) {
                            case '1':
                                var classTimeBegin = today + 'T000000Z';
                                var classTimeEnd = today + 'T013500Z';
                                break;
                            case '2':
                                var classTimeBegin = today + 'T015000Z';
                                var classTimeEnd = today + 'T041500Z';
                                break;
                            case '3':
                                var classTimeBegin = today + 'T053000Z';
                                var classTimeEnd = today + 'T070500Z';
                                break;
                            case '4':
                                var classTimeBegin = today + 'T072000Z';
                                var classTimeEnd = today + 'T085500Z';
                                break;
                            case '5':
                                var classTimeBegin = today + 'T093000Z';
                                var classTimeEnd = today + 'T110500Z';
                                break;
                            case '6':
                                var classTimeBegin = today + 'T112000Z';
                                var classTimeEnd = today + 'T134500Z';
                                break;
                        }

                        console.log(`ORGANIZER:${classTeacher}\nDTSTART;TZID=Asia/Shanghai:${classTimeBegin}\nDTEND;TZID=Asia/Shanghai:${classTimeEnd}\nRRULE:FREQ=WEEKLY;BYDAY=${classWeek};UNTIL=${classUntil};WKST=MO\nLOCATION:${classLocation}\nSUMMARY:${classTitle}\nDESCRIPTION:${classDesc}\n`)
                        var calendarData = `BEGIN:VCALENDAR\nVERSION:2.0\nMETHOD:PUBLISH\nBEGIN:VEVENT\nORGANIZER:${classTeacher}\nDTSTART;TZID=Asia/Shanghai:${classTimeBegin}\nDTEND;TZID=Asia/Shanghai:${classTimeEnd}\nRRULE:FREQ=WEEKLY;BYDAY=${classWeek};UNTIL=${classUntil};WKST=MO\nLOCATION:${classLocation}\nSUMMARY:${classTitle}（${classTeacher}）\nDESCRIPTION:${classDesc}\nPRIORITY:5\nCLASS:PUBLIC\nBEGIN:VALARM\nTRIGGER:-PT15M\nACTION:DISPLAY\nDESCRIPTION:Reminder\nEND:VALARM\nEND:VEVENT\nEND:VCALENDAR`;
                        var file = new File([calendarData], (classTitle + '-'+i+'.ics'), { type: "text/plain;charset=utf-8" });
                        saveAs(file);
                    }
                    
                }
                else {
                    alert('课程时间错误，无法导出。')
                }

            })
            $(this).find('div.state.stu').append(calendarBtn);

        })

        // 作业日历
        $('dd.stu').each(function () {

            var ddlBtn = $('<p class="calendar_btn myToobar"><a href="javascript:void()">导出作业日历</a></p>');
            ddlBtn.click(function () {
                $('body').prepend('<div onClick="$(this).hide()" id="manualAlert" style="display: none;position: absolute;width: 100%;height: 100%;background: #4646466b;z-index: 999;"><span style="background: #fffffff5;border-radius: 3px;left: 30%;right: 30%;position: fixed;text-align: center;padding: 3%;line-height: 40px;font-size: 30px;">作者偷懒，代码还没敲完！扫码催活<img src="https://exhen.github.io//assets/img/qrcode.png"></span></div>')
                    $('#manualAlert').fadeIn();
                    setTimeout(function () {
                        $('#manualAlert').fadeOut();
                    }, 10000)
            })
            $(this).find('div.state.stu').append(ddlBtn);

        })

        // 一键已读
        $('dd.stu').each(function () {

            var notificationBtn = $('<p class="calendar_btn myToobar"><a href="javascript:void()">公告一键已读</a></p>');
            notificationBtn.click(function () {
                $('body').prepend('<div onClick="$(this).hide()" id="manualAlert" style="display: none;position: absolute;width: 100%;height: 100%;background: #4646466b;z-index: 999;"><span style="background: #fffffff5;border-radius: 3px;left: 30%;right: 30%;position: fixed;text-align: center;padding: 3%;line-height: 40px;font-size: 30px;">作者偷懒，代码还没敲完！扫码催活<img src="https://exhen.github.io//assets/img/qrcode.png"></span></div>')
                    $('#manualAlert').fadeIn();
                    setTimeout(function () {
                        $('#manualAlert').fadeOut();
                    }, 10000)
            })
            $(this).find('div.state.stu').append(notificationBtn);

        })

        // 批量下载
        $('dd.stu').each(function () {

            var attachmentBtn = $('<p class="calendar_btn myToobar"><a href="javascript:void()">课件批量下载</a></p>');
            attachmentBtn.click(function () {
                $('body').prepend('<div onClick="$(this).hide()" id="manualAlert" style="display: none;position: absolute;width: 100%;height: 100%;background: #4646466b;z-index: 999;"><span style="background: #fffffff5;border-radius: 3px;left: 30%;right: 30%;position: fixed;text-align: center;padding: 3%;line-height: 40px;font-size: 30px;">作者偷懒，代码还没敲完！扫码催活<img src="https://exhen.github.io//assets/img/qrcode.png"></span></div>')
                    $('#manualAlert').fadeIn();
                    setTimeout(function () {
                        $('#manualAlert').fadeOut();
                    }, 10000)
            })
            $(this).find('div.state.stu').append(attachmentBtn);

        })

        return true
    } else {
        console.log('nothing happened!')
        return false
    }
}

window.addEventListener('load', function () {
    var icon = $('<div id="manualScript"><a ref="javascript:void(0);"><i class="webicon-recycle"></i>手动加载</a></div>');
    icon.find('a').click(function () {
        init();
    });
    $('div.header div.w div.right').append(icon)

    waitForKeyElements('dd.stu', init, true)

    // if (!init()) {
    //     console.log('appending suggestion')
    //     $('body').prepend('<div onClick="$(this).hide()" id="manualAlert" style="display: none;position: absolute;width: 100%;height: 100%;background: #4646466b;z-index: 999;"><span style="background: #fffffff5;border-radius: 3px;left: 30%;right: 30%;top: 25%;bottom: 25%;position: fixed;text-align: center;padding: 3%;line-height: 40px;font-size: 30px;">当前网速缓慢，脚本可能加载不畅，可以尝试右上角“手动加载”。</span></div>')
    //     $('#manualAlert').fadeIn();
    //     setTimeout(function () {
    //         $('#manualAlert').fadeOut();
    //     }, 2000)
    // };

})
