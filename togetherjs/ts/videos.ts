/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import { elementFinder } from "./elementFinder";
import { session } from "./session";
import $ from "jquery";

interface Listener {
    name: string,
    listener: (eventObject: JQueryEventObject, ...args: any[]) => void,
}

interface Options {
    silent?: boolean;
}

//define(["jquery", "util", "session", "elementFinder"], function($: JQueryStatic, _util: TogetherJSNS.Util, session: TogetherJSNS.Session, elementFinder: TogetherJSNS.ElementFinder) {

let listeners: Listener[] = [];

const TIME_UPDATE = 'timeupdate' as const;
const MIRRORED_EVENTS = ['play', 'pause'] as const;

const TOO_FAR_APART = 3000;

session.on("reinitialize", function() {
    unsetListeners();
    setupListeners();
});

session.on("ui-ready", setupListeners);

function setupListeners() {
    const videos = $('video');
    setupMirroredEvents(videos);
    setupTimeSync(videos);
}

function setupMirroredEvents(videos: JQuery) {
    let currentListener;
    MIRRORED_EVENTS.forEach(function(eventName) {
        currentListener = makeEventSender(eventName);
        videos.on(eventName, currentListener);
        listeners.push({
            name: eventName,
            listener: currentListener
        });
    });
}

function makeEventSender(eventName: "play" | "pause" | "timeupdate") {
    return function(event: Event, options: Options = {}) {
        const element = event.target as HTMLMediaElement;
        if(!options.silent && element) {
            session.send({
                type: `video-${eventName}` as const,
                location: elementFinder.elementLocation(element),
                position: element.currentTime
            });
        }
    };
}

function setupTimeSync(videos: JQuery) {
    videos.each(function(_i, video) {
        const onTimeUpdate = makeTimeUpdater();
        $(video).on(TIME_UPDATE, onTimeUpdate);
        listeners.push({
            name: TIME_UPDATE,
            listener: onTimeUpdate
        });
    });
}

function makeTimeUpdater() {
    let last = 0;
    return function(event: Event) {
        const currentTime = (event.target as HTMLMediaElement).currentTime;
        if(areTooFarApart(currentTime, last)) {
            makeEventSender(TIME_UPDATE)(event);
        }
        last = currentTime;
    };
}

function areTooFarApart(currentTime: number, lastTime: number) {
    const secDiff = Math.abs(currentTime - lastTime);
    const milliDiff = secDiff * 1000;
    return milliDiff > TOO_FAR_APART;
}

session.on("close", unsetListeners);

function unsetListeners() {
    const videos = $('video');
    listeners.forEach(function(event) {
        videos.off(event.name, event.listener);
    });
    listeners = [];
}


session.hub.on('video-timeupdate', function(msg: TogetherJSNS.SessionSend.VideoEventName<"timeupdate">) {
    const element = $findElement(msg.location);
    const oldTime = element.prop('currentTime');
    const newTime = msg.position;

    //to help throttle uneccesary position changes
    if(areTooFarApart(oldTime, newTime)) {
        setTime(element, msg.position);
    }
});

MIRRORED_EVENTS.forEach(function(eventName) {
    session.hub.on(`video-${eventName}` as const, function(msg: TogetherJSNS.SessionSend.VideoEventName<typeof eventName>) {
        const element = $findElement(msg.location);

        setTime(element, msg.position);

        element.trigger(eventName, { silent: true });
    });
});

//Currently does not discriminate between visible and invisible videos
function $findElement(location: string) {
    return $(elementFinder.findElement(location));
}

function setTime(video: JQuery, time: number) {
    video.prop('currentTime', time);
}
