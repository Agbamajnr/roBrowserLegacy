/**
 * UI/Components/ChatBoxTabSettings/ChatBoxTabSettings.js
 *
 * Chat Box Settings
 *
 * This file is part of ROBrowser, (http://www.robrowser.com/).
 *
 */
define(function (require) {
    'use strict';

    /**
     * Dependencies
     */
    var DB = require('DB/DBManager');
    var Preferences = require('Core/Preferences');
    var jQuery = require('Utils/jquery');
    var Renderer = require('Renderer/Renderer');
    var Client = require('Core/Client');
    var Mouse = require('Controls/MouseEventHandler');
    var UIManager = require('UI/UIManager');
    var UIComponent = require('UI/UIComponent');
    var htmlText = require('text!./ChatBoxTabSettings.html');
    var cssText = require('text!./ChatBoxTabSettings.css');
    /**
     * Create Component
     */
    var ChatBoxTabSettings = new UIComponent('ChatBoxTabSettings', htmlText, cssText);


    /**
     * @var {boolean} is ChatBoxTabSettings open ? (Temporary fix)
     */
    ChatBoxTabSettings.isOpen = false;

    ChatBoxTabSettings.tabOption = [];

    ChatBoxTabSettings.activeTab = 0;

    /**
     * @var {Preference} structure to save
     */
    var _preferences = Preferences.get('ChatBoxTabSettings', {
        x: 480,
        y: 200,
        width: 8,
        height: 4
    }, 1.0);


    /**
     * Initialize UI
     */
    ChatBoxTabSettings.init = function init() {
        // Bindings
        console.log('initialized tab window')
        this.ui.find('.extend').mousedown(onResize);
        this.ui.find('.close').click(function () {
            ChatBoxTabSettings.ui.hide();
        });
        this.draggable(this.ui.find('.titlebar'));
    };


    /**
     * Initialize UI
     */
    ChatBoxTabSettings.onAppend = function onAppend() {
        //resize( _preferences.width, _preferences.height );
        console.log('appended window')

        this.ui.css({
            top: Math.min(Math.max(0, _preferences.y), Renderer.height - this.ui.height()),
            left: Math.min(Math.max(0, _preferences.x), Renderer.width - this.ui.width())
        });
    };

    /**
     * Key Event Handler
     *
     * @param {object} event - KeyEventHandler
     * @return {boolean}
     */
    ChatBoxTabSettings.onKeyDown = function onKeyDown(event) { };


    /**
     * Resize ChatBoxTabSettings
     */
    function onResize() {
        var ui = ChatBoxTabSettings.ui;
        var top = ui.position().top;
        var left = ui.position().left;
        var lastWidth = 0;
        var lastHeight = 0;
        var _Interval;

        function resizeProcess() {
            var extraX = 23 + 16 + 16 - 30;
            var extraY = 31 + 19 - 30;

            var w = Math.floor((Mouse.screen.x - left - extraX) / 32);
            var h = Math.floor((Mouse.screen.y - top - extraY) / 32);

            // Maximum and minimum window size
            w = Math.min(Math.max(w, 7), 14);
            h = Math.min(Math.max(h, 3), 8);

            if (w === lastWidth && h === lastHeight) {
                return;
            }

            resize(w, h);
            lastWidth = w;
            lastHeight = h;
        }

        // Start resizing
        _Interval = setInterval(resizeProcess, 30);

        // Stop resizing
        jQuery(window).one('mouseup', function (event) {
            // Only on left click
            if (event.which === 1) {
                clearInterval(_Interval);
            }
        });
    }

    ChatBoxTabSettings.toggle = function toggle() {
        console.log('toggling ui')
        if (this.ui.is(':visible')) {
            this.ui.hide();
        } else {
            this.ui.show();
        }
    };

    /**
     * Extend inventory window size
     */
    function resize(width, height) {
        width = Math.min(Math.max(width, 7), 14);
        height = Math.min(Math.max(height, 3), 8);

        ChatBoxTabSettings.ui.css('width', 23 + 16 + 16 + width * 32);
        ChatBoxTabSettings.ui.find('.resize').css('height', height * 32);
    }


    /**
     * Create component and export it
     */
    return UIManager.addComponent(ChatBoxTabSettings);
});
