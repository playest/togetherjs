define(["require", "exports", "./types/togetherjs"], function (require, exports, togetherjs_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.analytics = void 0;
    var Analytics = /** @class */ (function () {
        function Analytics() {
        }
        Analytics.prototype.activate = function () {
            var enable = togetherjs_1.TogetherJS.config.get("enableAnalytics");
            var code = togetherjs_1.TogetherJS.config.get("analyticsCode");
            togetherjs_1.TogetherJS.config.close("enableAnalytics");
            togetherjs_1.TogetherJS.config.close("analyticsCode");
            if (!(enable && code)) {
                return;
            }
            // This is intended to be global:
            var gaq = window._gaq || [];
            gaq.push(["_setAccount", code]);
            gaq.push(['_setDomainName', location.hostname]);
            gaq.push(["_trackPageview"]);
            window._gaq = gaq;
            (function () {
                var ga = document.createElement('script');
                ga.type = 'text/javascript';
                ga.async = true;
                ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
                var s = document.getElementsByTagName('script')[0];
                s.parentNode.insertBefore(ga, s); // TODO !
            })();
        };
        ;
        return Analytics;
    }());
    exports.analytics = new Analytics();
});
//define(["util"], analyticsMain);
