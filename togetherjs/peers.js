/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
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
define(["require", "exports", "./init", "./session", "./storage", "./templates", "./togetherjs", "./util"], function (require, exports, init_1, session_1, storage_1, templates_1, togetherjs_1, util_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.peers = void 0;
    //function peersMain(util: TogetherJSNS.Util, session: TogetherJSNS.Session, storage: TogetherJSNS.Storage, require: Require, templates: TogetherJSNS.Templates) {
    var assert = util_1.util.assert;
    var CHECK_ACTIVITY_INTERVAL = 10 * 1000; // Every 10 seconds see if someone has gone idle
    var IDLE_TIME = 3 * 60 * 1000; // Idle time is 3 minutes
    var TAB_IDLE_TIME = 2 * 60 * 1000; // When you tab away, after two minutes you'll say you are idle
    var BYE_TIME = 10 * 60 * 1000; // After 10 minutes of inactivity the person is considered to be "gone"
    var ui;
    require(["ui"], function (uiModule) {
        ui = uiModule.ui;
    });
    var DEFAULT_NICKNAMES = templates_1.templates("names").split(/,\s*/g);
    var PeerClass = /** @class */ (function () {
        function PeerClass(id, attrs) {
            if (attrs === void 0) { attrs = {}; }
            this.isSelf = false;
            this.lastMessageDate = 0;
            this.hash = null;
            this.title = null;
            assert(id);
            assert(!Peer.peers[id]);
            this.id = id;
            this.identityId = attrs.identityId || null;
            this.status = attrs.status || "live";
            this.idle = attrs.status || "active";
            this.name = attrs.name || null;
            this.avatar = attrs.avatar || null;
            this.color = attrs.color || "#00FF00";
            this.view = ui.PeerView(this);
            this.following = attrs.following || false;
            PeerClass.peers[id] = this;
            var joined = attrs.joined || false;
            if (attrs.fromHelloMessage) {
                this.updateFromHello(attrs.fromHelloMessage);
                if (attrs.fromHelloMessage.type == "hello") {
                    joined = true;
                }
            }
            exports.peers.emit("new-peer", this);
            if (joined) {
                this.view.notifyJoined();
            }
            this.view.update();
        }
        PeerClass.prototype.repr = function () {
            return "Peer(" + JSON.stringify(this.id) + ")";
        };
        PeerClass.prototype.serialize = function () {
            return {
                id: this.id,
                status: this.status,
                idle: this.idle,
                url: this.url,
                hash: this.hash,
                title: this.title,
                identityId: this.identityId || undefined,
                rtcSupported: this.rtcSupported,
                name: this.name || undefined,
                avatar: this.avatar,
                color: this.color,
                following: this.following
            };
        };
        PeerClass.prototype.destroy = function () {
            this.view.destroy();
            delete Peer.peers[this.id];
        };
        PeerClass.prototype.updateMessageDate = function () {
            if (this.idle == "inactive") {
                this.update({ idle: "active" });
            }
            if (this.status == "bye") {
                this.unbye();
            }
            this.lastMessageDate = Date.now();
        };
        PeerClass.prototype.updateFromHello = function (msg) {
            var _a;
            var urlUpdated = false;
            // var activeRTC = false; // TODO code change, unused
            var identityUpdated = false;
            if ("url" in msg && msg.url && msg.url != this.url) {
                this.url = msg.url;
                this.hash = null;
                this.title = null;
                urlUpdated = true;
            }
            if ("urlHash" in msg && msg.urlHash != this.hash) {
                this.hash = (_a = msg.urlHash) !== null && _a !== void 0 ? _a : null; // TODO there was a weird mix of hash and urlHash here (see original), check that it's ok
                urlUpdated = true;
            }
            if ("title" in msg && msg.title != this.title) {
                this.title = msg.title || null;
                urlUpdated = true;
            }
            if ("rtcSupported" in msg && msg.rtcSupported !== undefined) {
                this.rtcSupported = msg.rtcSupported;
            }
            if ("identityId" in msg && msg.identityId !== undefined) {
                this.identityId = msg.identityId;
            }
            if ("name" in msg && msg.name && msg.name != this.name) {
                this.name = msg.name;
                identityUpdated = true;
            }
            if ("avatar" in msg && msg.avatar && msg.avatar != this.avatar) {
                util_1.util.assertValidUrl(msg.avatar);
                this.avatar = msg.avatar;
                identityUpdated = true;
            }
            if ("color" in msg && msg.color && msg.color != this.color) {
                this.color = msg.color;
                identityUpdated = true;
            }
            if ("isClient" in msg && msg.isClient !== undefined) {
                this.isCreator = !msg.isClient;
            }
            if (this.status != "live") {
                this.status = "live";
                exports.peers.emit("status-updated", this);
            }
            if (this.idle != "active") {
                this.idle = "active";
                exports.peers.emit("idle-updated", this);
            }
            if ("rtcSupported" in msg && msg.rtcSupported) {
                exports.peers.emit("rtc-supported", this);
            }
            if (urlUpdated) {
                exports.peers.emit("url-updated", this);
            }
            if (identityUpdated) {
                exports.peers.emit("identity-updated", this);
            }
            // FIXME: I can't decide if this is the only time we need to emit this message (and not .update() or other methods)
            if (this.following) {
                session_1.session.emit("follow-peer", this);
            }
        };
        PeerClass.prototype.update = function (attrs) {
            // FIXME: should probably test that only a couple attributes are settable particularly status and idle
            if (attrs.idle) {
                this.idle = attrs.idle;
            }
            if (attrs.status) {
                this.status = attrs.status;
            }
            this.view.update();
        };
        PeerClass.prototype.className = function (prefix) {
            if (prefix === void 0) { prefix = ""; }
            return prefix + util_1.util.safeClassName(this.id);
        };
        PeerClass.prototype.bye = function () {
            if (this.status != "bye") {
                this.status = "bye";
                exports.peers.emit("status-updated", this);
            }
            this.view.update();
        };
        PeerClass.prototype.unbye = function () {
            if (this.status == "bye") {
                this.status = "live";
                exports.peers.emit("status-updated", this);
            }
            this.view.update();
        };
        PeerClass.prototype.nudge = function () {
            session_1.session.send({
                type: "url-change-nudge",
                url: location.href,
                to: this.id
            });
        };
        PeerClass.prototype.follow = function () {
            if (this.following) {
                return;
            }
            exports.peers.getAllPeers().forEach(function (p) {
                if (p.following) {
                    p.unfollow();
                }
            });
            this.following = true;
            // We have to make sure we remember this, even if we change URLs:
            storeSerialization();
            this.view.update();
            session_1.session.emit("follow-peer", this);
        };
        PeerClass.prototype.unfollow = function () {
            this.following = false;
            storeSerialization();
            this.view.update();
        };
        PeerClass.deserialize = function (obj) {
            obj.fromStorage = true;
            new Peer(obj.id, obj);
            // TODO this function does nothing? except maybe adding the peer to the static list of peers
        };
        PeerClass.peers = {};
        return PeerClass;
    }());
    var Peer = PeerClass;
    // FIXME: I can't decide where this should actually go, seems weird that it is emitted and handled in the same module
    session_1.session.on("follow-peer", function (peer) {
        if (peer.url && peer.url != session_1.session.currentUrl()) {
            var url = peer.url;
            if (peer.urlHash) {
                url += peer.urlHash;
            }
            location.href = url;
        }
    });
    var PeersSelf = /** @class */ (function (_super) {
        __extends(PeersSelf, _super);
        function PeersSelf() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.isSelf = true;
            _this.id = session_1.session.clientId;
            _this.identityId = session_1.session.identityId;
            _this.status = "live";
            _this.idle = "active";
            _this.name = null;
            _this.avatar = null;
            _this.color = "#00FF00"; // TODO I added a default value, but is that ok?
            _this.defaultName = util_1.util.pickRandom(DEFAULT_NICKNAMES); // TODO set to a random one to avoid non-null casting but is it a valid value?
            // private loaded = false;// TODO unused
            _this.isCreator = !session_1.session.isClient;
            return _this;
        }
        PeersSelf.prototype.update = function (attrs) {
            var updatePeers = false;
            var updateIdle = false;
            var updateMsg = { type: "peer-update" }; // TODO maybe all fields in "peer-update" should be optional?
            if (typeof attrs.name == "string" && attrs.name != this.name) {
                this.name = attrs.name;
                updateMsg.name = this.name;
                if (!attrs.fromLoad) {
                    storage_1.storage.settings.set("name", this.name);
                    updatePeers = true;
                }
            }
            if (attrs.avatar && attrs.avatar != this.avatar) {
                util_1.util.assertValidUrl(attrs.avatar);
                this.avatar = attrs.avatar;
                updateMsg.avatar = this.avatar;
                if (!attrs.fromLoad) {
                    storage_1.storage.settings.set("avatar", this.avatar);
                    updatePeers = true;
                }
            }
            if (attrs.color && attrs.color != this.color) {
                this.color = attrs.color;
                updateMsg.color = this.color;
                if (!attrs.fromLoad) {
                    storage_1.storage.settings.set("color", this.color);
                    updatePeers = true;
                }
            }
            if (attrs.defaultName && attrs.defaultName != this.defaultName) {
                this.defaultName = attrs.defaultName;
                if (!attrs.fromLoad) {
                    storage_1.storage.settings.set("defaultName", this.defaultName);
                    updatePeers = true;
                }
            }
            if (attrs.status && attrs.status != this.status) {
                this.status = attrs.status;
                exports.peers.emit("status-updated", this);
            }
            if (attrs.idle && attrs.idle != this.idle) {
                this.idle = attrs.idle;
                updateIdle = true;
                exports.peers.emit("idle-updated", this);
            }
            this.view.update();
            if (updatePeers && !attrs.fromLoad) {
                session_1.session.emit("self-updated");
                session_1.session.send(updateMsg);
            }
            if (updateIdle && !attrs.fromLoad) {
                session_1.session.send({
                    type: "idle-status",
                    idle: this.idle
                });
            }
        };
        PeersSelf.prototype.className = function (prefix) {
            if (prefix === void 0) { prefix = ""; }
            return prefix + "self";
        };
        PeersSelf.prototype._loadFromSettings = function () {
            var _this = this;
            return util_1.util.resolveMany([
                storage_1.storage.settings.get("name"),
                storage_1.storage.settings.get("avatar"),
                storage_1.storage.settings.get("defaultName"),
                storage_1.storage.settings.get("color")
            ]).then(function (args) {
                var _a = args, name = _a[0], avatar = _a[1], defaultName = _a[2], color = _a[3]; // TODO !
                if (!defaultName) {
                    defaultName = util_1.util.pickRandom(DEFAULT_NICKNAMES);
                    storage_1.storage.settings.set("defaultName", defaultName);
                }
                if (!color) {
                    color = Math.floor(Math.random() * 0xffffff).toString(16);
                    while (color.length < 6) {
                        color = "0" + color;
                    }
                    color = "#" + color;
                    storage_1.storage.settings.set("color", color);
                }
                if (!avatar) {
                    avatar = togetherjs_1.TogetherJS.baseUrl + "/togetherjs/images/default-avatar.png";
                }
                _this.update({
                    name: name,
                    avatar: avatar,
                    defaultName: defaultName,
                    color: color,
                    fromLoad: true
                });
                exports.peers._SelfLoaded.resolve();
            }); // FIXME: ignoring error
        };
        PeersSelf.prototype._loadFromApp = function () {
            // FIXME: I wonder if these should be optionally functions?
            // We could test typeof==function to distinguish between a getter and a concrete value
            var getUserName = togetherjs_1.TogetherJS.config.get("getUserName");
            var getUserColor = togetherjs_1.TogetherJS.config.get("getUserColor");
            var getUserAvatar = togetherjs_1.TogetherJS.config.get("getUserAvatar");
            var name = null;
            var color = null;
            var avatar = null;
            if (getUserName) {
                if (typeof getUserName == "string") {
                    name = getUserName;
                }
                else {
                    name = getUserName();
                }
                if (name && typeof name != "string") {
                    // FIXME: test for HTML safe?  Not that we require it, but
                    // <>'s are probably a sign something is wrong.
                    console.warn("Error in getUserName(): should return a string (got", name, ")");
                    name = null;
                }
            }
            if (getUserColor) {
                if (typeof getUserColor == "string") {
                    color = getUserColor;
                }
                else {
                    color = getUserColor();
                }
                if (color && typeof color != "string") {
                    // FIXME: would be nice to test for color-ness here.
                    console.warn("Error in getUserColor(): should return a string (got", color, ")");
                    color = null;
                }
            }
            if (getUserAvatar) {
                if (typeof getUserAvatar == "string") {
                    avatar = getUserAvatar;
                }
                else {
                    avatar = getUserAvatar();
                }
                if (avatar && typeof avatar != "string") {
                    console.warn("Error in getUserAvatar(): should return a string (got", avatar, ")");
                    avatar = null;
                }
            }
            if (name || color || avatar) {
                this.update({
                    name: name || undefined,
                    color: color || undefined,
                    avatar: avatar || undefined
                });
            }
        };
        return PeersSelf;
    }(init_1.OnClass));
    var Peers = /** @class */ (function (_super) {
        __extends(Peers, _super);
        function Peers() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this._SelfLoaded = util_1.util.Deferred();
            return _this;
        }
        Peers.prototype.getPeer = function (id, message, ignoreMissing) {
            if (ignoreMissing === void 0) { ignoreMissing = false; }
            assert(id);
            var peer = Peer.peers[id];
            if (id === session_1.session.clientId) {
                return exports.peers.Self;
            }
            if (message && !peer) {
                peer = new Peer(id, { fromHelloMessage: message });
                return peer;
            }
            if (ignoreMissing && !peer) {
                return null;
            }
            assert(peer, "No peer with id:", id);
            if (message && (message.type == "hello" || message.type == "hello-back" || message.type == "peer-update")) {
                peer.updateFromHello(message);
                peer.view.update();
            }
            return Peer.peers[id];
        };
        Peers.prototype.getAllPeers = function (liveOnly) {
            if (liveOnly === void 0) { liveOnly = false; }
            var result = [];
            util_1.util.forEachAttr(Peer.peers, function (peer) {
                if (liveOnly && peer.status != "live") {
                    return;
                }
                result.push(peer);
            });
            return result;
        };
        return Peers;
    }(init_1.OnClass));
    exports.peers = new Peers();
    session_1.session.on("start", function () {
        if (exports.peers.Self) {
            return;
        }
        /* Same interface as Peer, represents oneself (local user): */
        // peer.Self init
        exports.peers.Self = new PeersSelf();
        exports.peers.Self.view = ui.PeerSelfView(exports.peers.Self);
        storage_1.storage.tab.get("peerCache").then(deserialize);
        exports.peers.Self._loadFromSettings().then(function () {
            exports.peers.Self._loadFromApp();
            exports.peers.Self.view.update();
            session_1.session.emit("self-updated");
        });
    });
    session_1.session.on("refresh-user-data", function () {
        if (exports.peers.Self) {
            exports.peers.Self._loadFromApp();
        }
    });
    togetherjs_1.TogetherJS.config.track("getUserName", togetherjs_1.TogetherJS.config.track("getUserColor", togetherjs_1.TogetherJS.config.track("getUserAvatar", function () {
        if (exports.peers.Self) {
            exports.peers.Self._loadFromApp();
        }
    })));
    function serialize() {
        var peers = [];
        util_1.util.forEachAttr(Peer.peers, function (peer) {
            peers.push(peer.serialize());
        });
        return { peers: peers };
    }
    function deserialize(obj) {
        if (!obj) {
            return;
        }
        obj.peers.forEach(function (peer) {
            Peer.deserialize(peer);
        });
    }
    function checkActivity() {
        var ps = exports.peers.getAllPeers();
        var now = Date.now();
        ps.forEach(function (p) {
            if (p.idle == "active" && now - p.lastMessageDate > IDLE_TIME) {
                p.update({ idle: "inactive" });
            }
            if (p.status != "bye" && now - p.lastMessageDate > BYE_TIME) {
                p.bye();
            }
        });
    }
    session_1.session.hub.on("bye", function (msg) {
        var peer = exports.peers.getPeer(msg.clientId);
        peer.bye(); // TODO we probably can't receive a bye message from ourself so it's always of type PeerClass
    });
    var checkActivityTask = null;
    session_1.session.on("start", function () {
        if (checkActivityTask) {
            console.warn("Old peers checkActivityTask left over?");
            clearTimeout(checkActivityTask);
        }
        checkActivityTask = setInterval(checkActivity, CHECK_ACTIVITY_INTERVAL);
    });
    session_1.session.on("close", function () {
        util_1.util.forEachAttr(Peer.peers, function (peer) {
            peer.destroy();
        });
        storage_1.storage.tab.set("peerCache", undefined);
        if (checkActivityTask !== null) {
            clearTimeout(checkActivityTask);
        }
        checkActivityTask = null;
    });
    var tabIdleTimeout = null;
    session_1.session.on("visibility-change", function (hidden) {
        if (hidden) {
            if (tabIdleTimeout) {
                clearTimeout(tabIdleTimeout);
            }
            tabIdleTimeout = setTimeout(function () {
                exports.peers.Self.update({ idle: "inactive" });
            }, TAB_IDLE_TIME);
        }
        else {
            if (tabIdleTimeout) {
                clearTimeout(tabIdleTimeout);
            }
            if (exports.peers.Self.idle == "inactive") {
                exports.peers.Self.update({ idle: "active" });
            }
        }
    });
    session_1.session.hub.on("idle-status", function (msg) {
        msg.peer.update({ idle: msg.idle });
    });
    // Pings are a straight alive check, and contain no more information:
    session_1.session.hub.on("ping", function () {
        session_1.session.send({ type: "ping-back" });
    });
    window.addEventListener("pagehide", function () {
        // FIXME: not certain if this should be tab local or not:
        storeSerialization();
    }, false);
    function storeSerialization() {
        storage_1.storage.tab.set("peerCache", serialize());
    }
    util_1.util.testExpose({
        setIdleTime: function (time) {
            IDLE_TIME = time;
            CHECK_ACTIVITY_INTERVAL = time / 2;
            if (togetherjs_1.TogetherJS.running) {
                if (checkActivityTask !== null) {
                    clearTimeout(checkActivityTask);
                }
                checkActivityTask = setInterval(checkActivity, CHECK_ACTIVITY_INTERVAL);
            }
        }
    });
    util_1.util.testExpose({
        setByeTime: function (time) {
            BYE_TIME = time;
            CHECK_ACTIVITY_INTERVAL = Math.min(CHECK_ACTIVITY_INTERVAL, time / 2);
            if (togetherjs_1.TogetherJS.running) {
                if (checkActivityTask !== null) {
                    clearTimeout(checkActivityTask);
                }
                checkActivityTask = setInterval(checkActivity, CHECK_ACTIVITY_INTERVAL);
            }
        }
    });
});
//return peers;
//define(["util", "session", "storage", "require", "templates"], peersMain);
