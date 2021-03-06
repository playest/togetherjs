/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import { peers } from "./peers";
import { session } from "./session";
import { templates } from "./templates";
import { templating } from "./templating";
import { ui } from "./ui";
import { util } from "./util";
import { windowing } from "./windowing";
import $ from "jquery";

//function walkthroughMain(util: TogetherJSNS.Util, ui: TogetherJSNS.Ui, $: JQueryStatic, windowing: TogetherJSNS.Windowing, templates: TogetherJSNS.Templates, templating: TogetherJSNS.Templating, session: TogetherJSNS.Session, peers: TogetherJSNS.Peers) {
const assert: typeof util.assert = util.assert.bind(util);
let onHideAll: (() => void) | null = null;
let container: JQuery; // TODO init
let slides: JQuery; // TODO init

function show(index: number) {
    slides.hide();
    $(slides[index]).show();
    const bullets = container.find("#togetherjs-walkthrough-progress .togetherjs-walkthrough-slide-progress");
    bullets.removeClass("togetherjs-active");
    $(bullets[index]).addClass("togetherjs-active");
    const $next = $("#togetherjs-walkthrough-next").removeClass("togetherjs-disabled");
    const $previous = $("#togetherjs-walkthrough-previous").removeClass("togetherjs-disabled");
    if(index == slides.length - 1) {
        $next.addClass("togetherjs-disabled");
    }
    else if(index === 0) {
        $previous.addClass("togetherjs-disabled");
    }
}

function previous() {
    let index = getIndex();
    index--;
    if(index < 0) {
        index = 0;
    }
    show(index);
}

function next() {
    let index = getIndex();
    index++;
    if(index >= slides.length) {
        index = slides.length - 1;
    }
    show(index);
}

function getIndex() {
    const active = slides.filter(":visible");
    if(!active.length) {
        return 0;
    }
    for(let i = 0; i < slides.length; i++) {
        if(slides[i] == active[0]) {
            return i;
        }
    }
    return 0;
}

export class Walkthrough {

    start(firstTime: boolean, doneCallback: (() => void) | null = null) {
        if(!container) {
            container = $(templates("walkthrough"));
            container.hide();
            ui.container.append(container);
            slides = container.find(".togetherjs-walkthrough-slide");
            slides.hide();
            const progress = $("#togetherjs-walkthrough-progress");
            slides.each(function(index) {
                const bullet = templating.sub("walkthrough-slide-progress", {});
                progress.append(bullet);
                bullet.click(function() {
                    show(index);
                });
            });
            container.find("#togetherjs-walkthrough-previous").click(previous);
            container.find("#togetherjs-walkthrough-next").click(next);
            ui.prepareShareLink(container);
            container.find(".togetherjs-self-name").bind("keyup", function(event) {
                const val = $(event.target).val();
                peers.Self.update({ name: val });
            });
            container.find(".togetherjs-swatch").click(function() {
                const picker = $("#togetherjs-pick-color");
                if(picker.is(":visible")) {
                    picker.hide();
                    return;
                }
                picker.show();
                picker.find(".togetherjs-swatch-active").removeClass("togetherjs-swatch-active");
                picker.find(".togetherjs-swatch[data-color=\"" + peers.Self.color + "\"]").addClass("togetherjs-swatch-active");
                const location = container.find(".togetherjs-swatch").offset()!; // TODO !
                picker.css({
                    top: location.top,
                    // The -7 comes out of thin air, but puts it in the right place:
                    left: location.left - 7
                });
            });
            if(session.isClient) {
                container.find(".togetherjs-if-creator").remove();
                container.find(".togetherjs-ifnot-creator").show();
            }
            else {
                container.find(".togetherjs-if-creator").show();
                container.find(".togetherjs-ifnot-creator").remove();
            }
            TogetherJS.config.track("siteName", function(value) {
                value = value || document.title;
                container.find(".togetherjs-site-name").text(value);
            });
            ui.activateAvatarEdit(container, {
                onSave: function() {
                    container.find("#togetherjs-avatar-when-saved").show();
                    container.find("#togetherjs-avatar-when-unsaved").hide();
                },
                onPending: function() {
                    container.find("#togetherjs-avatar-when-saved").hide();
                    container.find("#togetherjs-avatar-when-unsaved").show();
                }
            });
            // This triggers substititions in the walkthrough:
            peers.Self.update({});
            session.emit("new-element", container);
        }
        assert(typeof firstTime == "boolean", "You must provide a firstTime boolean parameter");
        if(firstTime) {
            container.find(".togetherjs-walkthrough-firsttime").show();
            container.find(".togetherjs-walkthrough-not-firsttime").hide();
        }
        else {
            container.find(".togetherjs-walkthrough-firsttime").hide();
            container.find(".togetherjs-walkthrough-not-firsttime").show();
        }
        onHideAll = doneCallback;
        show(0);
        windowing.show(container);
    }

    stop() {
        windowing.hide(container);
        if(onHideAll) {
            onHideAll();
            onHideAll = null;
        }
    }

}

export const walkthrough = new Walkthrough();

session.on("hide-window", function() {
    if(onHideAll) {
        onHideAll();
        onHideAll = null;
    }
});

//return walkthrough;

//define(["util", "ui", "jquery", "windowing", "templates", "templating", "session", "peers"], walkthroughMain);
