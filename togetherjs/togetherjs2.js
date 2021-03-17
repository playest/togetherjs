"use strict";
/* This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this file,
You can obtain one at http://mozilla.org/MPL/2.0/.
*/
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
function polyfillConsole() {
    // Make sure we have all of the console.* methods:
    if (typeof console == "undefined") {
        console = {};
    }
    if (!console.log) {
        console.log = function () { };
    }
    ["debug", "info", "warn", "error"].forEach(function (method) {
        if (!console[method]) {
            console[method] = console.log;
        }
    });
}
var defaultStartupInit = {
    // What element, if any, was used to start the session:
    button: null,
    // The startReason is the reason TogetherJS was started.  One of:
    //   null: not started
    //   started: hit the start button (first page view)
    //   joined: joined the session (first page view)
    reason: null,
    // Also, the session may have started on "this" page, or maybe is continued
    // from a past page.  TogetherJS.continued indicates the difference (false the
    // first time TogetherJS is started or joined, true on later page loads).
    continued: false,
    // This is set to tell the session what shareId to use, if the boot
    // code knows (mostly because the URL indicates the id).
    _joinShareId: null,
    // This tells session to start up immediately (otherwise it would wait
    // for session.start() to be run)
    _launch: false
};
var defaultConfiguration = {
    dontShowClicks: false,
    cloneClicks: false,
    enableAnalytics: false,
    analyticsCode: "UA-35433268-28",
    hubBase: null,
    getUserName: null,
    getUserColor: null,
    getUserAvatar: null,
    siteName: null,
    useMinimizedCode: undefined,
    cacheBust: true,
    on: {},
    hub_on: {},
    enableShortcut: false,
    toolName: null,
    findRoom: null,
    autoStart: false,
    suppressJoinConfirmation: false,
    suppressInvite: false,
    inviteFromRoom: null,
    storagePrefix: "togetherjs",
    includeHashInUrl: false,
    disableWebRTC: false,
    youtube: true,
    ignoreMessages: ["cursor-update", "keydown", "scroll-update"],
    ignoreForms: [":password"],
    lang: undefined,
    fallbackLang: "en-US"
};
var defaultConfiguration2 = {
    dontShowClicks: false,
    cloneClicks: false,
    enableAnalytics: false,
    analyticsCode: "UA-35433268-28",
    hubBase: "",
    getUserName: null,
    getUserColor: null,
    getUserAvatar: null,
    siteName: null,
    useMinimizedCode: undefined,
    on: {},
    hub_on: {},
    enableShortcut: false,
    toolName: null,
    findRoom: null,
    autoStart: false,
    suppressJoinConfirmation: false,
    suppressInvite: false,
    inviteFromRoom: null,
    storagePrefix: "togetherjs",
    includeHashInUrl: false,
    lang: null
};
var ConfigClass = /** @class */ (function () {
    function ConfigClass(tjsInstance) {
        this.tjsInstance = tjsInstance;
    }
    ConfigClass.prototype.call = function (name, maybeValue) {
        var settings;
        if (maybeValue === undefined) {
            if (typeof name != "object") {
                throw new Error('TogetherJS.config(value) must have an object value (not: ' + name + ')');
            }
            settings = name;
        }
        else {
            settings = {};
            settings[name] = maybeValue;
        }
        var tracker;
        var attr;
        for (attr in settings) {
            if (settings.hasOwnProperty(attr)) {
                if (this.tjsInstance._configClosed[attr] && this.tjsInstance.running) {
                    throw new Error("The configuration " + attr + " is finalized and cannot be changed");
                }
            }
        }
        for (attr in settings) {
            if (!settings.hasOwnProperty(attr)) {
                continue;
            }
            if (attr == "loaded" || attr == "callToStart") {
                continue;
            }
            if (!this.tjsInstance._defaultConfiguration.hasOwnProperty(attr)) {
                console.warn("Unknown configuration value passed to TogetherJS.config():", attr);
            }
            var previous = this.tjsInstance._configuration[attr];
            var o = { a: 1, b: "b", c: true };
            var key = "b";
            var a = o[key];
            var b = o[key];
            o[key] = o[key];
            var value = settings[attr]; // TODO any
            this.tjsInstance._configuration[attr] = value;
            var trackers = this.tjsInstance._configTrackers[name];
            var failed = false;
            for (var i = 0; i < trackers.length; i++) {
                try {
                    tracker = trackers[i];
                    tracker(value, previous);
                }
                catch (e) {
                    console.warn("Error setting configuration", name, "to", value, ":", e, "; reverting to", previous);
                    failed = true;
                    break;
                }
            }
            if (failed) {
                this.tjsInstance._configuration[attr] = previous;
                for (var i = 0; i < trackers.length; i++) {
                    try {
                        tracker = trackers[i];
                        tracker(value);
                    }
                    catch (e) {
                        console.warn("Error REsetting configuration", name, "to", previous, ":", e, "(ignoring)");
                    }
                }
            }
        }
    };
    ConfigClass.prototype.get = function (name) {
        var value = this.tjsInstance._configuration[name];
        if (value === undefined) {
            if (!this.tjsInstance._defaultConfiguration.hasOwnProperty(name)) {
                console.error("Tried to load unknown configuration value:", name);
            }
            value = this.tjsInstance._defaultConfiguration[name];
        }
        return value;
    };
    ConfigClass.prototype.track = function (name, callback) {
        if (!this.tjsInstance._defaultConfiguration.hasOwnProperty(name)) {
            throw new Error("Configuration is unknown: " + name);
        }
        callback(this.tjsInstance.config.get(name));
        if (!this.tjsInstance._configTrackers[name]) {
            this.tjsInstance._configTrackers[name] = [];
        }
        this.tjsInstance._configTrackers[name].push(callback);
        return callback;
    };
    ConfigClass.prototype.close = function (name) {
        if (!this.tjsInstance._defaultConfiguration.hasOwnProperty(name)) {
            throw new Error("Configuration is unknown: " + name);
        }
        this.tjsInstance._configClosed[name] = true;
        return this.get(name);
    };
    return ConfigClass;
}());
// TODO we use this function because we can't really create an object with a call signature AND fields, in the future we will just use a ConfigClass object and use .call instead of a raw call
function createConfigFunObj(confObj) {
    var config = (function (name, maybeValue) { return confObj.call(name, maybeValue); });
    config.get = function (name) { return confObj.get(name); };
    config.close = function (name) { return confObj.close(name); };
    config.track = function (name, callback) { return confObj.track(name, callback); };
    return config;
}
var TogetherJSClass = /** @class */ (function (_super) {
    __extends(TogetherJSClass, _super);
    function TogetherJSClass(event) {
        var _this = _super.call(this) || this;
        _this.running = false;
        _this.configObject = new ConfigClass(_this);
        _this.pageLoaded = Date.now();
        _this._startupInit = defaultStartupInit;
        _this.startup = _this._extend(_this._startupInit);
        _this._configuration = {};
        _this._defaultConfiguration = defaultConfiguration2;
        _this._configTrackers = {};
        _this._configClosed = {};
        _this._knownEvents = ["ready", "close"];
        _this.config = createConfigFunObj(_this.configObject);
        var session;
        if (_this.running) {
            session = _this.require("session");
            session.close();
            return _this;
        }
        _this.startup.button = null;
        try {
            if (event && typeof event == "object") {
                if ("target" in event && event.target && typeof event) {
                    _this.startup.button = event.target;
                }
                else if ("nodeType" in event && event.nodeType == 1) {
                    _this.startup.button = event;
                }
                else if (Array.isArray(event) && event[0] && event[0].nodeType == 1) {
                    // TODO What?
                    // Probably a jQuery element
                    _this.startup.button = event[0];
                }
            }
        }
        catch (e) {
            console.warn("Error determining starting button:", e);
        }
        if (window.TowTruckConfig) {
            console.warn("TowTruckConfig is deprecated; please use TogetherJSConfig");
            if (window.TogetherJSConfig) {
                console.warn("Ignoring TowTruckConfig in favor of TogetherJSConfig");
            }
            else {
                window.TogetherJSConfig = window.TowTruckConfig;
            }
        }
        if (window.TogetherJSConfig && (!window.TogetherJSConfig.loaded)) {
            _this.config(window.TogetherJSConfig);
            window.TogetherJSConfig.loaded = true;
        }
        // This handles loading configuration from global variables.  This
        // includes TogetherJSConfig_on_*, which are attributes folded into
        // the "on" configuration value.
        var attr;
        var attrName;
        var globalOns = {};
        for (attr in window) {
            if (attr.indexOf("TogetherJSConfig_on_") === 0) {
                attrName = attr.substr(("TogetherJSConfig_on_").length);
                var a = window[attr];
                globalOns[attrName] = window[attr];
            }
            else if (attr.indexOf("TogetherJSConfig_") === 0) {
                attrName = attr.substr(("TogetherJSConfig_").length);
                _this.config(attrName, window[attr]);
            }
            else if (attr.indexOf("TowTruckConfig_on_") === 0) {
                attrName = attr.substr(("TowTruckConfig_on_").length);
                console.warn("TowTruckConfig_* is deprecated, please rename", attr, "to TogetherJSConfig_on_" + attrName);
                globalOns[attrName] = window[attr];
            }
            else if (attr.indexOf("TowTruckConfig_") === 0) {
                attrName = attr.substr(("TowTruckConfig_").length);
                console.warn("TowTruckConfig_* is deprecated, please rename", attr, "to TogetherJSConfig_" + attrName);
                _this.config(attrName, window[attr]);
            }
        }
        // FIXME: copy existing config?
        // FIXME: do this directly in this.config() ?
        // FIXME: close these configs?
        var ons = _this.config.get("on");
        for (attr in globalOns) {
            if (globalOns.hasOwnProperty(attr)) {
                // FIXME: should we avoid overwriting?  Maybe use arrays?
                ons[attr] = globalOns[attr];
            }
        }
        _this.config("on", ons);
        for (attr in ons) {
            _this.on(attr, ons[attr]);
        }
        var hubOns = _this.config.get("hub_on");
        if (hubOns) {
            for (attr in hubOns) {
                if (hubOns.hasOwnProperty(attr)) {
                    _this.hub.on(attr, hubOns[attr]);
                }
            }
        }
        if (!_this.config.close('cacheBust')) {
            cacheBust = '';
            delete _this.requireConfig.urlArgs;
        }
        if (!_this.startup.reason) {
            // Then a call to TogetherJS() from a button must be started TogetherJS
            _this.startup.reason = "started";
        }
        // FIXME: maybe I should just test for this.require:
        if (_this._loaded) {
            session = _this.require("session");
            addStyle();
            session.start();
            return _this;
        }
        // A sort of signal to session.js to tell it to actually
        // start itself (i.e., put up a UI and try to activate)
        _this.startup._launch = true;
        addStyle();
        var minSetting = _this.config.get("useMinimizedCode");
        _this.config.close("useMinimizedCode");
        if (minSetting !== undefined) {
            min = !!minSetting;
        }
        var requireConfig = _this._extend(_this.requireConfig);
        var deps = ["session", "jquery"];
        var lang = _this.getConfig("lang");
        // [igoryen]: We should generate this value in Gruntfile.js, based on the available translations
        var availableTranslations = {
            "en-US": true,
            "en": "en-US",
            "es": "es-BO",
            "es-BO": true,
            "ru": true,
            "ru-RU": "ru",
            "pl": "pl-PL",
            "pl-PL": true,
            "de-DE": true,
            "de": "de-DE"
        };
        if (!lang) {
            // BCP 47 mandates hyphens, not underscores, to separate lang parts
            lang = navigator.language.replace(/_/g, "-");
        }
        // TODO check if the updates of those conditions is right
        // if(/-/.test(lang) && !availableTranslations[lang]) {
        if (/-/.test(lang) && (!("lang" in availableTranslations) || !availableTranslations[lang])) {
            lang = lang.replace(/-.*$/, '');
        }
        // if(!availableTranslations[lang]) {
        if (!("lang" in availableTranslations) || !availableTranslations[lang]) {
            lang = _this.config.get("fallbackLang");
        }
        // else if(availableTranslations[lang] !== true) {
        else if (availableTranslations[lang] !== true) {
            lang = availableTranslations[lang];
        }
        _this.config("lang", lang);
        var localeTemplates = "templates-" + lang;
        deps.splice(0, 0, localeTemplates);
        function callback(session, jquery) {
            this._loaded = true;
            if (!min) {
                this.require = require.config({ context: "togetherjs" });
                this._requireObject = require;
            }
        }
        if (!min) {
            if (typeof require == "function") {
                if (!require.config) {
                    console.warn("The global require (", require, ") is not requirejs; please use togetherjs-min.js");
                    throw new Error("Conflict with window.require");
                }
                _this.require = require.config(requireConfig);
            }
        }
        if (typeof _this.require == "function") {
            // This is an already-configured version of require
            _this.require(deps, callback);
        }
        else {
            requireConfig.deps = deps;
            requireConfig.callback = callback;
            if (!min) {
                window.require = requireConfig;
            }
        }
        if (min) {
            addScript("/togetherjs/togetherjsPackage.js");
        }
        else {
            addScript("/togetherjs/libs/require.js");
        }
        return _this;
    }
    ;
    TogetherJSClass.prototype._extend = function (base, extensions) {
        if (!extensions) {
            extensions = base;
            base = {};
        }
        for (var a in extensions) {
            if (extensions.hasOwnProperty(a)) {
                base[a] = extensions[a];
            }
        }
        return base;
    };
    ;
    TogetherJSClass.prototype._mixinEvents = function (cls) {
        // TODO this function is a way to make the cls arg inherit of the On features, its use should be reworked to use TS inheritance, so fat this implementation does nothing so FIX IT
        return proto;
    };
    ;
    TogetherJSClass.prototype._teardown = function () {
        var requireObject = this._requireObject || window.require;
        // FIXME: this doesn't clear the context for min-case
        if (requireObject.s && requireObject.s.contexts) {
            delete requireObject.s.contexts.togetherjs;
        }
        this._loaded = false;
        this.startup = this._extend(this._startupInit);
        this.running = false;
    };
    ;
    TogetherJSClass.prototype.toString = function () {
        return "TogetherJS";
    };
    ;
    TogetherJSClass.prototype.reinitialize = function () {
        if (this.running && typeof this.require == "function") {
            this.require(["session"], function (session) {
                session.emit("reinitialize");
            });
        }
        // If it's not set, TogetherJS has not been loaded, and reinitialization is not needed
    };
    ;
    TogetherJSClass.prototype.getConfig = function (name) {
        var value = this._configuration[name];
        if (value === undefined) {
            if (!this._defaultConfiguration.hasOwnProperty(name)) {
                console.error("Tried to load unknown configuration value:", name);
            }
            value = this._defaultConfiguration[name];
        }
        return value;
    };
    ;
    TogetherJSClass.prototype.refreshUserData = function () {
        if (this.running && typeof this.require == "function") {
            this.require(["session"], function (session) {
                session.emit("refresh-user-data");
            });
        }
    };
    ;
    TogetherJSClass.prototype._onmessage = function (msg) {
        var type = msg.type;
        if (type.search(/^app\./) === 0) {
            type = type.substr("app.".length);
        }
        else {
            type = "togetherjs." + type;
        }
        msg.type = type;
        this.hub.emit(msg.type, msg);
    };
    ;
    TogetherJSClass.prototype.send = function (msg) {
        if (!this.require) {
            throw "You cannot use TogetherJS.send() when TogetherJS is not running";
        }
        var session = this.require("session");
        session.appSend(msg);
    };
    ;
    TogetherJSClass.prototype.shareUrl = function () {
        if (!this.require) {
            return null;
        }
        var session = this.require("session");
        return session.shareUrl();
    };
    ;
    TogetherJSClass.prototype.listenForShortcut = function () {
        console.warn("Listening for alt-T alt-T to start TogetherJS");
        this.removeShortcut();
        listener = function listener(event) {
            if (event.which == 84 && event.altKey) {
                if (listener.pressed) {
                    // Second hit
                    TogetherJS();
                }
                else {
                    listener.pressed = true;
                }
            }
            else {
                listener.pressed = false;
            }
        };
        this.once("ready", this.removeShortcut);
        document.addEventListener("keyup", listener, false);
    };
    ;
    TogetherJSClass.prototype.removeShortcut = function () {
        if (listener) {
            document.addEventListener("keyup", listener, false);
            listener = null;
        }
    };
    ;
    TogetherJSClass.prototype.checkForUsersOnChannel = function (address, callback) {
        if (address.search(/^https?:/i) === 0) {
            address = address.replace(/^http/i, 'ws');
        }
        var socket = new WebSocket(address);
        var gotAnswer = false;
        socket.onmessage = function (event) {
            var msg = JSON.parse(event.data);
            if (msg.type != "init-connection") {
                console.warn("Got unexpected first message (should be init-connection):", msg);
                return;
            }
            if (gotAnswer) {
                console.warn("Somehow received two responses from channel; ignoring second");
                socket.close();
                return;
            }
            gotAnswer = true;
            socket.close();
            callback(msg.peerCount);
        };
        socket.onclose = socket.onerror = function () {
            if (!gotAnswer) {
                console.warn("Socket was closed without receiving answer");
                gotAnswer = true;
                callback(undefined);
            }
        };
    };
    ;
    return TogetherJSClass;
}(OnClass));
function baseUrl1() {
    var baseUrl = "__baseUrl__";
    if (baseUrl == "__" + "baseUrl__") {
        // Reset the variable if it doesn't get substituted
        baseUrl = "";
    }
    // Allow override of baseUrl (this is done separately because it needs
    // to be done very early)
    if (window.TogetherJSConfig && window.TogetherJSConfig.baseUrl) {
        baseUrl = window.TogetherJSConfig.baseUrl;
    }
    if (window.TogetherJSConfig_baseUrl) {
        baseUrl = window.TogetherJSConfig_baseUrl;
    }
    return baseUrl;
}
(function () {
    var styleSheet = "/togetherjs/togetherjs.css";
    function addStyle() {
        var existing = document.getElementById("togetherjs-stylesheet");
        if (!existing) {
            var link = document.createElement("link");
            link.id = "togetherjs-stylesheet";
            link.setAttribute("rel", "stylesheet");
            link.href = baseUrl + styleSheet +
                (cacheBust ? ("?bust=" + cacheBust) : '');
            document.head.appendChild(link);
        }
    }
    function addScript(url) {
        var script = document.createElement("script");
        script.src = baseUrl + url +
            (cacheBust ? ("?bust=" + cacheBust) : '');
        document.head.appendChild(script);
    }
    var baseUrl = baseUrl1();
    defaultConfiguration.baseUrl = baseUrl;
    // True if this file should use minimized sub-resources:
    //@ts-expect-error _min_ is replaced in packaging so comparison always looks false in code
    var min = "__min__" == "__" + "min__" ? false : "__min__" == "yes";
    var baseUrlOverrideString = localStorage.getItem("togetherjs.baseUrlOverride");
    var baseUrlOverride;
    if (baseUrlOverrideString) {
        try {
            baseUrlOverride = JSON.parse(baseUrlOverrideString);
        }
        catch (e) {
            baseUrlOverride = null;
        }
        if ((!baseUrlOverride) || baseUrlOverride.expiresAt < Date.now()) {
            // Ignore because it has expired
            localStorage.removeItem("togetherjs.baseUrlOverride");
        }
        else {
            baseUrl = baseUrlOverride.baseUrl;
            var logger = console.warn || console.log;
            logger.call(console, "Using TogetherJS baseUrlOverride:", baseUrl);
            logger.call(console, "To undo run: localStorage.removeItem('togetherjs.baseUrlOverride')");
        }
    }
    function copyConfigInWindow(configOverride) {
        var shownAny = false;
        for (var _attr in configOverride) {
            var attr = _attr;
            if (!configOverride.hasOwnProperty(attr)) {
                continue;
            }
            if (attr == "expiresAt" || !configOverride.hasOwnProperty(attr)) {
                continue;
            }
            if (!shownAny) {
                console.warn("Using TogetherJS configOverride");
                console.warn("To undo run: localStorage.removeItem('togetherjs.configOverride')");
            }
            window["TogetherJSConfig_" + attr] = configOverride[attr];
            console.log("Config override:", attr, "=", configOverride[attr]);
        }
    }
    var configOverrideString = localStorage.getItem("togetherjs.configOverride");
    var configOverride;
    if (configOverrideString) {
        try {
            configOverride = JSON.parse(configOverrideString);
        }
        catch (e) {
            configOverride = null;
        }
        if ((!configOverride) || configOverride.expiresAt < Date.now()) {
            localStorage.removeItem("togetherjs.configOverride");
        }
        else {
            copyConfigInWindow(configOverride);
        }
    }
    var version = "unknown";
    // FIXME: we could/should use a version from the checkout, at least for production
    var cacheBust = "__gitCommit__";
    if ((!cacheBust) || cacheBust == "__gitCommit__") {
        cacheBust = Date.now() + "";
    }
    else {
        version = cacheBust;
    }
    polyfillConsole();
    if (!baseUrl) {
        var scripts = document.getElementsByTagName("script");
        for (var i = 0; i < scripts.length; i++) {
            var src = scripts[i].src;
            if (src && src.search(/togetherjs(-min)?.js(\?.*)?$/) !== -1) {
                baseUrl = src.replace(/\/*togetherjs(-min)?.js(\?.*)?$/, "");
                console.warn("Detected baseUrl as", baseUrl);
                break;
            }
            else if (src && src.search(/togetherjs-min.js(\?.*)?$/) !== -1) {
                baseUrl = src.replace(/\/*togetherjs-min.js(\?.*)?$/, "");
                console.warn("Detected baseUrl as", baseUrl);
                break;
            }
        }
    }
    if (!baseUrl) {
        console.warn("Could not determine TogetherJS's baseUrl (looked for a <script> with togetherjs.js and togetherjs-min.js)");
    }
    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    var TogetherJS = new TogetherJSClass();
    window["TogetherJS"] = TogetherJS;
    TogetherJS.requireConfig = {
        context: "togetherjs",
        baseUrl: baseUrl + "/togetherjs",
        urlArgs: "bust=" + cacheBust,
        paths: {
            jquery: "libs/jquery-1.11.1.min",
            walkabout: "libs/walkabout/walkabout",
            esprima: "libs/walkabout/lib/esprima",
            falafel: "libs/walkabout/lib/falafel",
            tinycolor: "libs/tinycolor",
            whrandom: "libs/whrandom/random"
        }
    };
    // !!!!!!!!!!!!!!!!!
    TogetherJS._mixinEvents(TogetherJS);
    var defaultHubBase = "__hubUrl__";
    if (defaultHubBase == "__" + "hubUrl" + "__") {
        // Substitution wasn't made
        defaultHubBase = "https://ks3371053.kimsufi.com:7071";
    }
    defaultConfiguration.hubBase = defaultHubBase;
    // FIXME: there's a point at which configuration can't be updated (e.g., hubBase after the TogetherJS has loaded).  We should keep track of these and signal an error if someone attempts to reconfigure too late
    TogetherJS._defaultConfiguration = defaultConfiguration;
    /* TogetherJS.config(configurationObject)
       or: TogetherJS.config(configName, value)
  
       Adds configuration to TogetherJS.  You may also set the global variable TogetherJSConfig
       and when TogetherJS is started that configuration will be loaded.
  
       Unknown configuration values will lead to console error messages.
       */
    //Config !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    // This should contain the output of "git describe --always --dirty"
    // FIXME: substitute this on the server (and update make-static-client)
    TogetherJS.version = version;
    TogetherJS.baseUrl = baseUrl;
    TogetherJS.hub = TogetherJS._mixinEvents({});
    var listener = null;
    TogetherJS.config.track("enableShortcut", function (enable, previous) {
        if (enable) {
            TogetherJS.listenForShortcut();
        }
        else if (previous) {
            TogetherJS.removeShortcut();
        }
    });
    // It's nice to replace this early, before the load event fires, so we conflict
    // as little as possible with the app we are embedded in:
    var hash = location.hash.replace(/^#/, "");
    var m = /&?togetherjs=([^&]*)/.exec(hash);
    if (m) {
        TogetherJS.startup._joinShareId = m[1];
        TogetherJS.startup.reason = "joined";
        var newHash = hash.substr(0, m.index) + hash.substr(m.index + m[0].length);
        location.hash = newHash;
    }
    if (window._TogetherJSShareId) {
        // A weird hack for something the addon does, to force a shareId.
        // FIXME: probably should remove, it's a wonky feature.
        TogetherJS.startup._joinShareId = window._TogetherJSShareId;
        delete window._TogetherJSShareId;
    }
    function conditionalActivate() {
        if (window.TogetherJSConfig_noAutoStart) {
            return;
        }
        // A page can define this function to defer TogetherJS from starting
        var callToStart = window.TogetherJSConfig_callToStart;
        if (!callToStart && window.TowTruckConfig_callToStart) {
            callToStart = window.TowTruckConfig_callToStart;
            console.warn("Please rename TowTruckConfig_callToStart to TogetherJSConfig_callToStart");
        }
        if (window.TogetherJSConfig && window.TogetherJSConfig.callToStart) {
            callToStart = window.TogetherJSConfig.callToStart;
        }
        if (callToStart) {
            // FIXME: need to document this:
            callToStart(onload);
        }
        else {
            onload();
        }
    }
    // FIXME: can we push this up before the load event?
    // Do we need to wait at all?
    function onload() {
        if (TogetherJS.startup._joinShareId) {
            TogetherJS();
        }
        else if (window._TogetherJSBookmarklet) {
            delete window._TogetherJSBookmarklet;
            TogetherJS();
        }
        else {
            // FIXME: this doesn't respect storagePrefix:
            var key = "togetherjs-session.status";
            var valueString = sessionStorage.getItem(key);
            if (valueString) {
                var value = JSON.parse(valueString);
                if (value && value.running) {
                    TogetherJS.startup.continued = true;
                    TogetherJS.startup.reason = value.startupReason;
                    TogetherJS();
                }
            }
            else if (window.TogetherJSConfig_autoStart ||
                (window.TogetherJSConfig && window.TogetherJSConfig.autoStart)) {
                TogetherJS.startup.reason = "joined";
                TogetherJS();
            }
        }
    }
    conditionalActivate();
    // FIXME: wait until load event to double check if this gets set?
    if (window.TogetherJSConfig_enableShortcut) {
        TogetherJS.listenForShortcut();
    }
    // For compatibility:
    window.TowTruck = TogetherJS;
})();