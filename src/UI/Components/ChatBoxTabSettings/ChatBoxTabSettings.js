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
    var ChatBox;
    /**
     * Create Component
     */

    var ChatBoxTabSettings = new UIComponent('ChatBoxTabSettings', htmlText, cssText);


    /**
     * @var {boolean} is ChatBoxTabSettings open ? (Temporary fix)
     */
    ChatBoxTabSettings.activeTab = 0;

    ChatBoxTabSettings.tabs = [];

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
        ChatBox = require('UI/Components/ChatBox/ChatBox');
        ChatBoxTabSettings.tabs = ChatBox.tabs

        this.ui.css({
            top: Math.min(Math.max(0, _preferences.y), Renderer.height - this.ui.height()),
            left: Math.min(Math.max(0, _preferences.x), Renderer.width - this.ui.width())
        });

        const listNode = this.ui.find('#settings_list')
        listNode.empty()

        if (Array.isArray(ChatBoxTabSettings.tabs) && ChatBoxTabSettings.tabs.length > 0) {
            for (const tab of ChatBoxTabSettings.tabs) {
                listNode.append(`
                <div class="tab" data-tab="${tab.id}">
                    <div  style="display:none;" class="blinking-light"></div>
                    <h3 class="tab-name">${tab.name}</h3>
                    <div class="remove">X</div>
                    <div class="move">↑</div>
                </div>
                `);

                this.ui.find(`#settings_list .tab[data-tab="${tab.id}"] .tab-name`).on('click', function (event) {
                    ChatBox.switchTab(tab.id)
                    ChatBoxTabSettings.updateAlerter(tab.id, false)
                    ChatBox.ui.find('table.header tr td.tab[data-tab="' + tab.id + '"] div input').removeClass('blink')
                    ChatBox.ui.find('.body.large .tabs .main-tabs div.tab[data-tab="' + tab.id + '"] div input').removeClass('blink')
                })

                this.ui.find(`#settings_list .tab[data-tab="${tab.id}"] .blinking-light`).on('click', function (event) {
                    ChatBox.switchTab(tab.id)
                    ChatBoxTabSettings.updateAlerter(tab.id, false)
                    ChatBox.ui.find('table.header tr td.tab[data-tab="' + tab.id + '"] div input').removeClass('blink')
                    ChatBox.ui.find('.body.large .tabs .main-tabs div.tab[data-tab="' + tab.id + '"] div input').removeClass('blink')
                })

                this.ui.find(`#settings_list .tab[data-tab="${tab.id}"] .remove`).on('click', function (event) {
                    ChatBoxTabSettings.removeTab(tab.id)
                })
                this.ui.find(`#settings_list .tab[data-tab="${tab.id}"] .move`).on('click', function (event) {
                    ChatBox.moveTabPosition(tab.id)
                })
            }
        }
    };

    /**
     * Key Event Handler
     *
     * @param {object} event - KeyEventHandler
     * @return {boolean}
     */
    ChatBoxTabSettings.onKeyDown = function onKeyDown(event) { };

    ChatBoxTabSettings.updateAlerter = function updateAlerter(tab, state) {
        if (state === true) {
            this.ui.find(`#settings_list .tab[data-tab="${tab}"] .blinking-light`).css('display', 'block')
        } else {
            this.ui.find(`#settings_list .tab[data-tab="${tab}"] .blinking-light`).css('display', 'none')
        }
    }

    ChatBoxTabSettings.addTab = function addTab(tab) {
        ChatBoxTabSettings.tabs[tab.id] = tab

        this.ui.find('#settings_list').append(`
            <div class="tab" data-tab="${tab.id}">
                <div style="display:none;" class="blinking-light"></div>
                <h3 class="tab-name">${tab.name}</h3>
                <div class="remove">X</div>
                <div class="move">↑</div>
            </div>
        `);

        this.ui.find(`#settings_list .tab[data-tab="${tab.id}"] .tab-name`).on('click', function (event) {
            ChatBox.switchTab(tab.id)
            ChatBoxTabSettings.updateAlerter(tab.id, false)
            ChatBox.ui.find('table.header tr td.tab[data-tab="' + tab.id + '"] div input').removeClass('blink')
        })

        this.ui.find(`#settings_list .tab[data-tab="${tab.id}"] .blinking-light`).on('click', function (event) {
            ChatBox.switchTab(tab.id)
            ChatBoxTabSettings.updateAlerter(tab.id, false)
            ChatBox.ui.find('table.header tr td.tab[data-tab="' + tab.id + '"] div input').removeClass('blink')
        })

        this.ui.find(`#settings_list .tab[data-tab="${tab.id}"] .remove`).on('click', function (event) {
            ChatBoxTabSettings.removeTab(tab.id)
        })

        this.ui.find(`#settings_list .tab[data-tab="${tab.id}"] .move`).click(function () {
            ChatBoxTabSettings.updateCellPosition(tab.id)
            ChatBox.moveTabPosition(tab.id)
        })
    };

    ChatBoxTabSettings.removeTab = function removeTab(tabID) {
        var confirmDelete = confirm('Are you sure you want to delete Tab: ' + ChatBoxTabSettings.tabs[tabID].name)
        if (confirmDelete === true) {
            ChatBox.switchTab(tabID)
            ChatBox.removeTab()
            ChatBoxTabSettings.tabs[tabID]
            delete ChatBoxTabSettings.tabs[tabID];
            this.ui.find('#settings_list .tab[data-tab="' + tabID + '"]').remove()
        }
    }


    ChatBoxTabSettings.updateCellPosition = function updateCellPosition(tabID) {
        var parentNode = this.ui.find('#settings_list')
        var childNode = this.ui.find('#settings_list .tab[data-tab="' + tabID + '"]')
        if (childNode && ChatBoxTabSettings.tabs[tabID]) {
            childNode.remove()
            parentNode.prepend(`
            <div class="tab" data-tab="${tabID}">
                <div style="display:none;" class="blinking-light"></div>
                <h3 class="tab-name">${ChatBoxTabSettings.tabs[tabID].name}</h3>
                <div class="remove">X</div>
                <div class="move">↑</div>
            </div>
			`)


            this.ui.find(`#settings_list .tab[data-tab="${tabID}"] .tab-name`).on('click', function (event) {
                ChatBox.switchTab(tabID)
                ChatBoxTabSettings.updateAlerter(tabID, false)
                ChatBox.ui.find('table.header tr td.tab[data-tab="' + tabID + '"] div input').removeClass('blink')
            })

            this.ui.find(`#settings_list .tab[data-tab="${tabID}"] .blinking-light`).on('click', function (event) {
                ChatBox.switchTab(tabID)
                ChatBoxTabSettings.updateAlerter(tabID, false)
                ChatBox.ui.find('table.header tr td.tab[data-tab="' + tabID + '"] div input').removeClass('blink')
            })

            this.ui.find(`#settings_list .tab[data-tab="${tabID}"] .remove`).on('click', function (event) {
                ChatBoxTabSettings.removeTab(tabID)
            })

            this.ui.find(`#settings_list .tab[data-tab="${tabID}"] .move`).click(function () {
                ChatBoxTabSettings.updateCellPosition(tabID)
                ChatBox.moveTabPosition(tabID)
            })
        }
    }

    ChatBoxTabSettings.updateTabName = function updateTabName(tabID, value) {
        this.ui.find(`#settings_list .tab[data-tab="${tabID}"] .tab-name`).text(value)
        if (ChatBoxTabSettings.tabs[tabID]) {
            ChatBoxTabSettings.tabs[tabID].name = value;
        }
    };


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
