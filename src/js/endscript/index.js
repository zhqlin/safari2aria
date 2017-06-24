import toastr from 'mini-toastr'
import bdlx from './baiduLixian'
import downloadAble from '@/public/downloadAble'

if (window.top === window) {
  (function () {

    var mObserver;
    var config;
    var keyPressed = {};
    let i18n={
      'zh-CN':{
        'Success switch the default download service to':'成功切换默认下载服务至',
        'The current download service is':'当前下载服务为',
     }
    };
    function getText (text,options={}) {
      let lang = config.language || navigator.language;
      if(i18n[lang]&&i18n[lang][text]){
        return [i18n[lang][text],' '].join('');
      }else{
        return options.notfailback?'':[text,' '].join('')
      }
    }
    function selectedLinks () {
      var sel = window.getSelection().toString();
      if (sel.match(/^https?/) || sel.match(/magnet:/)) {
        return sel;
      }
      return null
    }

    function linkForTarget (e) {
      var result = null;
      if ("BODY" === e.tagName) {
        result = null
      } else if (e.tagName === "IMG" && e.src) {
        result = e.src
      } else if (e.href) {
        result = e.href
      } else if (e.parentNode) {
        result = linkForTarget(e.parentNode)
      }
      return result
    }

    function handleMessage (e) {
      if (e.name === "changeRpc") {
        toastr.success(getText('Success switch the default download service to') + e.message);
      }
      if (e.name === "currentRpc") {
        toastr.success(getText('The current download service is') + e.message);
      }
      if (e.name === "showMassage") {
        toastr[e.message.action || "success"](e.message.text, e.message.title);
      }
      if (e.name === "baiduLixian") {
        if (location.href.match(/^https?:\/\/pan\.baidu\.com/)) {
          bdlx(e.message.url)
        }
      }
      if (e.name === "sendToEndScript") {
        config = e.message || {};
        catchIframe();
        safari.self.tab.dispatchMessage("documentReady", {
          cookie: document.cookie
        });
      }
      if (e.message && e.message.hasCb) {
        safari.self.tab.dispatchMessage([e.name, 'cb'].join('_'), {
          cookie: document.cookie
        });
      }
    }

    function handleContextMenu (e) {
      var n = [
        linkForTarget(e.target) || selectedLinks(),
        document.location.href,
        document.cookie
      ];
      safari.self.tab.setContextMenuEventUserInfo(e, n)
    }

    function catchIframe () {
      if (mObserver) {
        if (!config.catchIframe) {
          mObserver.disconnect();
        }
        return
      }
      if (config.catchIframe) {
        mObserver = new MutationObserver(function (mutations) {
          mutations.some(function (mutation) {
            if (mutation.target.tagName === "IFRAME" && mutation.type === 'attributes' && mutation.attributeName === 'src' && downloadAble(mutation.target.src,config,keyPressed)) {
              if (mutation.target.src.match(/^https:\/\/127\.0\.0\.1\//)) {
                return false
              } else {
                safari.self.tab.dispatchMessage("downloadFromIframe", {
                  url: mutation.target.src,
                  cookie: document.cookie
                });
                mutation.target.src = "https://127.0.0.1/";
              }
              return false;
            }
            return false;
          });
        });
        mObserver.observe(document.body, {
          attributes: true,
          attributeFilter: ['src'],
          attributeOldValue: true,
          characterData: false,
          characterDataOldValue: false,
          childList: false,
          subtree: true
        });
      }
    }

    document.onkeydown = function (event) {
      var unicode = event.charCode ? event.charCode : event.keyCode;
      keyPressed[unicode] = true;
      //console.log('onkeydown:',keyPressed);
      sendKeyPressEvent()
    };

    document.onkeyup = function (event) {
      var unicode = event.charCode ? event.charCode : event.keyCode;
      delete keyPressed[unicode];
      sendKeyPressEvent()
    };
    window.onblur = function (event) {
      keyPressed = {};
      sendKeyPressEvent()
    };

    function sendKeyPressEvent () {
      keyPressed.isCommandPressed=!!keyPressed[91];
      keyPressed.isShiftPressd=!!keyPressed[16];
      keyPressed.isOptionPressd=!!keyPressed[18];
      safari.self.tab.dispatchMessage("keyPress", {
        keyPressed
      });
    }


    function init () {
      toastr.init({
        appendTarget: document.body,
        timeout: 5000
      });
      safari.self.tab.dispatchMessage("getConfig");

      document.addEventListener("contextmenu", handleContextMenu, !1);

      safari.self.addEventListener("message", handleMessage, !1);
      sendKeyPressEvent();
    }

    init()

  })()
}
