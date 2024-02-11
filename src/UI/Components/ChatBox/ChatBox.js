/**
 * UI/Components/ChatBox/ChatBox.js
 *
 * ChatBox windows
 *
 * This file is part of ROBrowser, (http://www.robrowser.com/).
 *
 * @author Vincent Thibault
 */
define(function (require) {
	'use strict';


	/**
	 * Dependencies
	 */
	var DB = require('DB/DBManager');
	var jQuery = require('Utils/jquery');
	var Renderer = require('Renderer/Renderer');
	var Client = require('Core/Client');
	var Events = require('Core/Events');
	var Preferences = require('Core/Preferences');
	var KEYS = require('Controls/KeyEventHandler');
	var Mouse = require('Controls/MouseEventHandler');
	var BattleMode = require('Controls/BattleMode');
	var History = require('./History');
	var UIManager = require('UI/UIManager');
	var UIComponent = require('UI/UIComponent');
	var ContextMenu = require('UI/Components/ContextMenu/ContextMenu');
	var htmlText = require('text!./ChatBox.html');
	var cssText = require('text!./ChatBox.css');
	var Commands = require('Controls/ProcessCommand');
	var ChatBoxSettings = require('UI/Components/ChatBoxSettings/ChatBoxSettings');
	var ChatBoxTabSettings = require('UI/Components/ChatBoxTabSettings/ChatBoxTabSettings');


	/**
	 * @var {number} max message in the chatbox
	 */
	var MAX_MSG = 400;
	var MAX_LENGTH = 100;
	var MAGIC_NUMBER = 3 * 14;


	/**
	 * @var {History} message cached in history
	 */
	var _historyMessage = new History();


	/**
	 * @var {History} nickname cached in history
	 */
	var _historyNickName = new History(true);



	/**
	 * @var {number} Chatbox position's index
	 */
	var _heightIndex = 2;


	/**
	 * @var {Preferences} structure
	 */
	var _preferences = Preferences.get('ChatBox', {
		x: 0,
		y: Infinity,
		height: 2,
		magnet_top: false,
		magnet_bottom: true,
		magnet_left: true,
		magnet_right: false,
		tabs: [],
		tabOption: [],
		activeTab: 0

	}, 1.0);


	/**
	 * Create Basic Info component
	 */
	var ChatBox = new UIComponent('ChatBox', htmlText, cssText);


	/**
	 * Constants
	 */
	ChatBox.TYPE = {
		SELF: 1 << 0,
		PUBLIC: 1 << 1,
		PRIVATE: 1 << 2,
		PARTY: 1 << 3,
		GUILD: 1 << 4,
		ANNOUNCE: 1 << 5,
		ERROR: 1 << 6,
		INFO: 1 << 7,
		BLUE: 1 << 8, // TODO: find a better name
		ADMIN: 1 << 9,
		MAIL: 1 << 10,
	};

	ChatBox.FILTER = {
		PUBLIC_LOG: 0,
		PUBLIC_CHAT: 1,
		WHISPER: 2,
		PARTY: 3,
		GUILD: 4,
		ITEM: 5,
		EQUIP: 6,
		STATUS: 7,
		PARTY_ITEM: 8,
		PARTY_STATUS: 9,
		SKILL_FAIL: 10,
		PARTY_SETUP: 11,
		EQUIP_DAMAGE: 12,
		WOE: 13,
		PARTY_SEARCH: 14,
		BATTLE: 15,
		PARTY_BATTLE: 16,
		EXP: 17,
		PARTY_EXP: 18,
		QUEST: 19,
		BATTLEFIELD: 20,
		CLAN: 21,
		//CALL:			22, // Display Call messages
	};

	/**
	 * @var {number} target message ?
	 */
	ChatBox.sendTo = ChatBox.TYPE.PUBLIC;


	/**
	 * Storage to cache the private messages
	 * Ugly system used by official client, can lead to errors
	 */
	ChatBox.PrivateMessageStorage = {
		nick: '',
		msg: ''
	};

	ChatBox.lastTabID = -1;
	ChatBox.tabCount = 0;
	ChatBox.activeTab = 0;

	ChatBox.tabs = [];

	/**
	 * Initialize UI
	 */
	ChatBox.init = function init() {
		_heightIndex = _preferences.height - 1;
		ChatBox.updateHeight();

		this.ui.mouseover(function () {
			Mouse.intersect = false;
		})
			.mouseout(function () {
				Mouse.intersect = true;
			});

		this.ui.css({
			top: Math.min(Math.max(0, _preferences.y - this.ui.height()), Renderer.height - this.ui.height()),
			left: Math.min(Math.max(0, _preferences.x), Renderer.width - this.ui.width())
		});

		// show large chatbox on portrait mode
		const portrait = window.matchMedia("(orientation: portrait)").matches;
		if (portrait == true) {
			ChatBox.toggleLargeChatBox(true)
			this.ui.find('#chatbox').css({
				'width': '100vw !important'
			})
			this.ui.find('.body.large').css({
				'width': '100% !important'
			})
			this.ui.find('.large-header').css({
				'width': '100% !important'
			})
			this.ui.find('.input.large').css({
				'width': '100% !important'
			})
		}

		window.matchMedia("(orientation: portrait)").addEventListener("change", e => {
			const portrait = e.matches;

			if (portrait == true) {
				ChatBox.toggleLargeChatBox(true)
				this.ui.find('#chatbox').css({
					'width': '100vw !important'
				})
				this.ui.find('.body.large').css({
					'width': '100% !important'
				})
				this.ui.find('.large-header').css({
					'width': '100% !important'
				})
				this.ui.find('.input.large').css({
					'width': '100% !important'
				})
			}
		});


		this.magnet.TOP = _preferences.magnet_top;
		this.magnet.BOTTOM = _preferences.magnet_bottom;
		this.magnet.LEFT = _preferences.magnet_left;
		this.magnet.RIGHT = _preferences.magnet_right;

		this.draggable(this.ui.find('.body.small'));
		this.draggable(this.ui.find('.body.large'));
		this.draggable(this.ui.find('.input.small'));
		this.draggable(this.ui.find('.input.large'));
		this.draggable(this.ui.find('.large-header'));
		this.draggable(this.ui.find('.battlemode'));

		// Sorry for this un-documented code (see UIComponent for more informations)
		this.__mouseStopBlock = this.ui.find('.input.small');
		this.__mouseStopBlock = this.ui.find('.input.large');

		// Setting chatbox scrollbar
		Client.loadFiles([DB.INTERFACE_PATH + 'basic_interface/dialscr_down.bmp', DB.INTERFACE_PATH + 'basic_interface/dialscr_up.bmp'], function (down, up) {
			jQuery('style:first').append([
				'#chatbox .content::-webkit-scrollbar { width: 10px; height: 10px;}',
				'#chatbox .content::-webkit-scrollbar-button:vertical:start:increment,',
				'#chatbox .content::-webkit-scrollbar-button:vertical:end:decrement { display: none;}',
				'#chatbox .content::-webkit-scrollbar-corner:vertical { display:none;}',
				'#chatbox .content::-webkit-scrollbar-resizer:vertical { display:none;}',
				'#chatbox .content::-webkit-scrollbar-button:start:decrement,',
				'#chatbox .content::-webkit-scrollbar-button:end:increment { display: block; border:none;}',
				'#chatbox .content::-webkit-scrollbar-button:vertical:increment { background: url(' + down + ') no-repeat; height:10px;}',
				'#chatbox .content::-webkit-scrollbar-button:vertical:decrement { background: url(' + up + ') no-repeat; height:10px;}',
				'#chatbox .content::-webkit-scrollbar-track-piece:vertical { background:black; border:none;}',
				'#chatbox .content::-webkit-scrollbar-thumb:vertical { background:grey; -webkit-border-image:none; border-color:transparent;border-width: 0px 0; }'
			].join('\n'));
		});

		// set filter type in button
		if (ChatBox.sendTo > 0) {
			switch (ChatBox.sendTo) {
				case 16:
					ChatBox.ui.find('.input.large .btn.filter button').text('Guild')
					break;
				case 8:
					ChatBox.ui.find('.input.large .btn.filter button').text('Party')
					break;
				default:
					ChatBox.ui.find('.input.large .btn.filter button').text('Public')
					break;
			}
		}

		// Input selection
		this.ui.find('.input.small input').mousedown(function (event) {
			this.select();
			event.stopImmediatePropagation();
			return false;
		});
		this.ui.find('.input.large input').mousedown(function (event) {
			this.select();
			event.stopImmediatePropagation();
			return false;
		});

		this.ui.find('.input .message').blur(function () {
			Events.setTimeout(function () {
				if (!document.activeElement.tagName.match(/input|select|textarea/i)) {
					this.ui.find('.input .message').focus();
				}
			}.bind(this), 1);
		}.bind(this));

		this.ui.find('.input.small .message').blur(function () {
			Events.setTimeout(function () {
				if (!document.activeElement.tagName.match(/input|select|textarea/i)) {
					this.ui.find('.input.large .message').focus();
				}
			}.bind(this), 1);
		}.bind(this));

		this.ui.find('.input.small .message')[0].maxLength = MAX_LENGTH;
		this.ui.find('.input.large .message')[0].maxLength = MAX_LENGTH;

		this.ui.find('.input.small .username').blur(function () {
			Events.setTimeout(function () {
				if (!document.activeElement.tagName.match(/input|select|textarea/i)) {
					this.ui.find('.input .username').focus();
				}
			}.bind(this), 1);
		}.bind(this));
		this.ui.find('.input.large .username').blur(function () {
			Events.setTimeout(function () {
				if (!document.activeElement.tagName.match(/input|select|textarea/i)) {
					this.ui.find('.input .username').focus();
				}
			}.bind(this), 1);
		}.bind(this));

		// open large chatbox on clicking small chatbox message box
		this.ui.find('.input.small input').click((event) => {
			ChatBox.toggleLargeChatBox(true)
		})



		// watch for big chatbox send button
		this.ui.find('.input.large .btn.send').click((event) => {
			const messageBox = this.ui.find(('.input #message'))
			if (messageBox) {
				messageBox.focus()
			}
			this.submit({ target: { id: 'message' } });
		})

		// Validate information dragged into text field
		this.ui.find('input[type=text]')
			.on('drop', onDropText)
			.on('dragover', stopPropagation)

		// Button change name
		this.ui.find('.header input').dblclick(function () {
			this.type = 'text';
			this.select();
		}).blur(function () {
			this.type = 'button';
		});

		// Private message selection
		this.ui.find('.input .list').click(function () {
			var names = _historyNickName.list;
			var i, count = names.length;
			var pos = jQuery(this).offset();
			var ui = ContextMenu.ui.find('.menu');

			if (!count) {
				ChatBox.addText(DB.getMessage(192), ChatBox.TYPE.ERROR, ChatBox.FILTER.PUBLIC_LOG);
				return;
			}

			ContextMenu.remove();
			ContextMenu.append();

			for (i = 0; i < count; ++i) {
				ContextMenu.addElement(names[i], onPrivateMessageUserSelection(names[i]));
			}

			ContextMenu.addElement('', onPrivateMessageUserSelection(''));
			ui.css({
				top: pos.top - ui.height() - 5,
				left: pos.left - ui.width() - 5
			});
		}).mousedown(function (event) {
			event.stopImmediatePropagation();
			return false;
		});

		this.ui.find('.draggable').mousedown(function (event) {
			event.stopImmediatePropagation();
			return false;
		});

		// Send message to...
		this.ui.find('.input.small .filter').click(function () {
			var pos = jQuery(this).offset();
			var ui = ContextMenu.ui.find('.menu');

			ContextMenu.remove();
			ContextMenu.append();

			ContextMenu.addElement(DB.getMessage(85), onChangeTargetMessage(ChatBox.TYPE.PUBLIC));
			ContextMenu.addElement(DB.getMessage(86), onChangeTargetMessage(ChatBox.TYPE.PARTY));
			ContextMenu.addElement(DB.getMessage(437), onChangeTargetMessage(ChatBox.TYPE.GUILD));

			ui.css({
				top: pos.top - ui.height() - 5,
				left: pos.left - ui.width() + 25
			});
		}).mousedown(function (event) {
			event.stopImmediatePropagation();
			return false;
		});
		this.ui.find('.input.large .filter').click(function () {
			var pos = jQuery(this).offset();
			var ui = ContextMenu.ui.find('.menu');

			ContextMenu.remove();
			ContextMenu.append();

			ContextMenu.addElement(DB.getMessage(85), onChangeTargetMessage(ChatBox.TYPE.PUBLIC));
			ContextMenu.addElement(DB.getMessage(86), onChangeTargetMessage(ChatBox.TYPE.PARTY));
			ContextMenu.addElement(DB.getMessage(437), onChangeTargetMessage(ChatBox.TYPE.GUILD));

			ui.css({
				top: pos.top - ui.height() - 5,
				left: pos.left - ui.width() + 25
			});
		}).mousedown(function (event) {
			event.stopImmediatePropagation();
			return false;
		});

		// Change size
		this.ui.find('.input.small .size').click(function (event) {
			ChatBox.updateHeight(true);
			event.stopImmediatePropagation();
			return false;
		});
		this.ui.find('.input.large .size').click(function (event) {
			ChatBox.updateHeight(true);
			event.stopImmediatePropagation();
			return false;
		});

		// Scroll feature should block at each line
		this.ui.find('.content').on('mousewheel DOMMouseScroll', onScroll);

		this.ui.find('.battlemode .bmtoggle').click(function (event) {
			ChatBox.ui.find('.input.small').toggle();
			ChatBox.ui.find('.input.large').toggle();
			ChatBox.ui.find('.battlemode').toggle();
		});

		this.ui.find('.chat-function .battleopt2').click(function (event) {
			if (ChatBox.tabCount <= 5) {
				ChatBox.addNewTab();
				ChatBox.onAppend();
			}
		});

		// enter tab event
		this.ui.on('click', 'table.header tr td.tab', function (event) {
			event.stopImmediatePropagation();
			var currentElem = event.currentTarget;
			if (ChatBox.activeTab !== currentElem.dataset.tab - 1) {
				ChatBox.switchTab(currentElem.dataset.tab);
			}
			ChatBox.toggleLargeChatBox(true)

			ChatBoxTabSettings.updateAlerter(currentElem.dataset.tab, false)
			ChatBox.ui.find('table.header tr td.tab[data-tab="' + currentElem.dataset.tab + '"] div input').removeClass('blink')
		});

		// also watch for dblclick on main tab
		this.ui.on('dblclick', 'table.header tr td.tab', function (event) {
			var currentElem = event.currentTarget;
			if (currentElem) {
				var input = ChatBox.ui.find('table.header tr td.tab[data-tab="' + currentElem.dataset.tab + '"] div input')
				if (input) {
					input.removeAttr('readonly')
					input.focus()
				}
			}
		});

		this.ui.find('.chat-function .wndminib').click(function () {
			if (ChatBox.tabCount > 1) {
				ChatBox.removeTab();
			}
		});

		this.ui.find('.chat-function .chatmode').click(function () {
			ChatBox.toggleChat();
		});

		this.ui.find('.chat-function .battleopt').click(function () {
			ChatBox.toggleChatBattleOption();
		});

		// open tab setting component
		this.ui.find('.header .opttab .mainopttab .tabsettingsopt').click(function () {
			ChatBox.toggleChatTabSettingsWindow()
		});
		this.ui.find('.body.large .tabs .bottom-tabs .settings-tab').click(function () {
			ChatBox.toggleChatTabSettingsWindow()
		});

		// Init settings window as well
		ChatBoxSettings.append();
		ChatBoxTabSettings.append();


		if (_preferences.tabs.length > 0 && _preferences.tabs.length == _preferences.tabOption.length) {
			// Load saved tabs
			for (var i = 0; i < _preferences.tabs.length; i++) {
				if (_preferences.tabs[i] && _preferences.tabOption[i]) {
					ChatBox.addNewTab(_preferences.tabs[i].name, _preferences.tabOption[i]);
				}
			}

			// Switch to last active tab
			if (ChatBox.tabs[_preferences.activeTab]) {
				this.switchTab(_preferences.activeTab);
			}
		} else {
			// Default tabs
			var firstTab = ChatBox.addNewTab(DB.getMessage(1291), [
				ChatBox.FILTER.PUBLIC_LOG,
				ChatBox.FILTER.PUBLIC_CHAT,
				ChatBox.FILTER.WHISPER,
				ChatBox.FILTER.PARTY,
				ChatBox.FILTER.GUILD,
				ChatBox.FILTER.ITEM,
				ChatBox.FILTER.EQUIP,
				ChatBox.FILTER.STATUS,
				ChatBox.FILTER.PARTY_ITEM,
				ChatBox.FILTER.PARTY_STATUS,
				ChatBox.FILTER.SKILL_FAIL,
				ChatBox.FILTER.PARTY_SETUP,
				ChatBox.FILTER.EQUIP_DAMAGE,
				ChatBox.FILTER.WOE,
				ChatBox.FILTER.PARTY_SEARCH,
				ChatBox.FILTER.QUEST,
				ChatBox.FILTER.BATTLEFIELD,
				ChatBox.FILTER.CLAN
			]); // Public Log

			ChatBox.addNewTab(DB.getMessage(1292)); // Battle Log

			// switch to first
			ChatBox.switchTab(firstTab);
		}


		// dialog box size
		makeResizableDiv()
	};

	ChatBox.toggleLargeChatBox = function toggleLargeChatBox(state) {
		if (state === true) {
			// manage body
			this.ui.find('.body.large').show()
			this.ui.find('.body.small').hide()


			// manage input field
			this.ui.find('.input.small').hide()
			this.ui.find('.input.large').show()

			// manage header
			this.ui.find('table.header').hide()
			this.ui.find('.large-header').show()


			// manage chat function
			this.ui.find('.chat-function.small').hide()
			this.ui.find('.chat-function.large').show()

		} else {
			// manage input
			this.ui.find('.input.small').show()
			this.ui.find('.input.large').hide()

			// manage header
			this.ui.find('table.header').show()
			this.ui.find('.large-header').hide()


			// manage body 
			this.ui.find('.body.small').show()
			this.ui.find('.body.large').hide()

			// manage chat function
			this.ui.find('.chat-function.small').show()
			this.ui.find('.chat-function.large').hide()

		}
	}


	/**
	 * Clean up the box
	 */
	ChatBox.clean = function Clean() {
		var matches, i, count;

		matches = this.ui.find('.content').html().match(/(blob:[^"]+)/g);

		if (matches) {
			for (i = 0, count = matches.length; i < count; ++i) {
				window.URL.revokeObjectURL(matches[i]);
			}
		}

		this.ui.find('.content').empty();
		this.ui.find('.input .message').val('');
		this.ui.find('.input .username').val('');
		this.ui.find('.input.large .message').val('');
		this.ui.find('.input.large .username').val('');

		_historyMessage.clear();
		_historyNickName.clear();
	};

	ChatBox.toggleChatBattleOption = function toggleChatBattleOption() {
		if (this.ui.find('.body.large .tabs .main-tabs div.on input').css('display') !== 'none') {
			var tabName = this.ui.find('.body.large .tabs .main-tabs div.tab div.on input').val();
			ChatBoxSettings.toggle();
			ChatBoxSettings.updateTab(this.activeTab, tabName);
		} else {
			var tabName = this.ui.find('.header tr td div.on input').val();
			ChatBoxSettings.toggle();
			ChatBoxSettings.updateTab(this.activeTab, tabName);
		}
	}

	ChatBox.toggleChatTabSettingsWindow = function toggleChatTabSettingsWindow() {
		ChatBoxTabSettings.toggle();
	}


	ChatBox.removeTab = function removeTab() {
		// ChatBoxTabSettings.removeTab(this.activeTab);

		this.ui.find('table.header tr td.tab[data-tab="' + this.activeTab + '"]').remove();
		this.ui.find('.body.large .tabs .main-tabs div.tab[data-tab="' + this.activeTab + '"]').remove();
		this.ui.find('.body.small .content[data-content="' + this.activeTab + '"]').remove();
		this.ui.find('.body.large .content[data-content="' + this.activeTab + '"]').remove();

		var tabName = '';
		var tabName2 = '';
		var _elem = this.ui.find('table.header tr td.tab');
		_elem = this.ui.find('table.header tr td.tab')[_elem.length - 1];
		var _elem2 = this.ui.find('.body.large .tabs .main-tabs div.tab');
		if (_elem2) {
			_elem2 = this.ui.find('.body.large .tabs .main-tabs div.tab')[_elem2.length - 1];
		}

		// Use delete instead of splice to avoid ID messup and make our life eastier.
		delete ChatBoxSettings.tabOption[this.activeTab];
		delete this.tabs[this.activeTab];
		this.tabCount--;

		ChatBox.switchTab(_elem.dataset.tab);
		if (_elem2) {
			ChatBox.switchTab(_elem2.dataset.tab);
		}

		tabName = this.ui.find('.header tr td div.on input').val();
		tabName2 = this.ui.find('.body.large .tabs .main-tabs div.tab div.on input').val();

		if (this.ui.find('.body.large').css('display') !== 'none') {
			ChatBoxSettings.updateTab(this.activeTab, tabName2);
		} else {
			ChatBoxSettings.updateTab(this.activeTab, tabName);
		}

	}

	ChatBox.addNewTab = function addNewTab(name, settings) {

		// Default settings
		if (!name) {
			name = 'New Tab';
		}
		if (!settings) {
			settings = [
				ChatBox.FILTER.PUBLIC_LOG,
				ChatBox.FILTER.PUBLIC_CHAT,
				ChatBox.FILTER.WHISPER,
				ChatBox.FILTER.PARTY,
				ChatBox.FILTER.GUILD,
				ChatBox.FILTER.ITEM,
				ChatBox.FILTER.EQUIP,
				ChatBox.FILTER.STATUS,
				ChatBox.FILTER.PARTY_ITEM,
				ChatBox.FILTER.PARTY_STATUS,
				ChatBox.FILTER.SKILL_FAIL,
				ChatBox.FILTER.PARTY_SETUP,
				ChatBox.FILTER.EQUIP_DAMAGE,
				ChatBox.FILTER.WOE,
				ChatBox.FILTER.PARTY_SEARCH,
				ChatBox.FILTER.BATTLE,
				ChatBox.FILTER.PARTY_BATTLE,
				ChatBox.FILTER.EXP,
				ChatBox.FILTER.PARTY_EXP,
				ChatBox.FILTER.QUEST,
				ChatBox.FILTER.BATTLEFIELD,
				ChatBox.FILTER.CLAN
			];
		}

		var tabName = name;
		var tabID = ++this.lastTabID;

		var tab = {};
		tab.id = tabID;
		tab.name = tabName;

		// Store prev height
		// var height = this.ui.find('.contentwrapper').height();

		// Remove current active state
		this.ui.find('table.header tr td.tab div')
			.removeClass('on');
		this.ui.find('.body.large .tabs .main-tabs .tab div')
			.removeClass('on');
		this.ui.find('.body.small .content')
			.removeClass('active');
		this.ui.find('.body.large .content')
			.removeClass('active');

		// Add new elements as active
		this.ui.find('table.header tr .opttab').before(`
			<td class="tab" data-tab="${tabID}">
				<div class="on">
					<input readonly id="tab-input" type="text" value="${tabName}"/>
				</div>
			</td>
		`);

		this.ui.find('.body.large .tabs .main-tabs').append(`
			<div class="tab" data-tab="${tabID}">
				<div class="on">
					<input readonly id="tab-input" type="text" value="${tabName}"/>
				</div>
			</div>
		`);

		this.ui.find('table.header tr td.tab[data-tab="' + tabID + '"] div input').on('dblclick', function () {
			var input = ChatBox.ui.find('table.header tr td.tab[data-tab="' + tabID + '"] div input')
			if (input) {
				input.removeAttr('readonly')
				input.focus()
			}
		});
		this.ui.find('.body.large .tabs .main-tabs div.tab[data-tab="' + tabID + '"] div input').on('dblclick', function () {
			var input = ChatBox.ui.find('.body.large .tabs .main-tabs div.tab[data-tab="' + tabID + '"] div input')
			if (input) {
				input.removeAttr('readonly')
				input.focus()
			}
		});



		this.ui.find('table.header tr td.tab[data-tab="' + tabID + '"] div input').on('click', function () {
			ChatBox.switchTab(tabID);
			ChatBox.toggleLargeChatBox(true)

			ChatBoxTabSettings.updateAlerter(tabID, false)
			ChatBox.ui.find('table.header tr td.tab[data-tab="' + tabID + '"] div input').removeClass('blink')
		});
		this.ui.find('.body.large .tabs .main-tabs div.tab[data-tab="' + tabID + '"] div input').on('click', function () {
			ChatBox.switchTab(tabID);

			ChatBox.toggleLargeChatBox(true)

			ChatBoxTabSettings.updateAlerter(tabID, false)
			ChatBox.ui.find('.body.large .tabs .main-tabs div.tab[data-tab="' + tabID + '"] div input').removeClass('blink')
		});



		this.ui.find('table.header tr td.tab[data-tab="' + tabID + '"] div input').on('blur', function () {
			var input = ChatBox.ui.find('table.header tr td.tab[data-tab="' + tabID + '"] div input')
			input.attr('readonly', '')
		});
		this.ui.find('.body.large .tabs .main-tabs div.tab[data-tab="' + tabID + '"] div input').on('blur', function () {
			var input = ChatBox.ui.find('.body.large .tabs .main-tabs div.tab[data-tab="' + tabID + '"] div input')
			input.attr('readonly', '')
		});


		this.ui.find('table.header tr td.tab[data-tab="' + tabID + '"] div input').on('change', function () {
			ChatBox.tabs[tabID].name = this.value;
			ChatBox.ui.find('.large-header .activeTabName').text(this.value)
			ChatBoxTabSettings.updateTabName(tabID, this.value)
		});
		this.ui.find('.body.large .tabs .main-tabs div.tab[data-tab="' + tabID + '"] div input').on('change', function () {
			ChatBox.tabs[tabID].name = this.value;
			ChatBox.ui.find('.large-header .activeTabName').text(this.value)
			ChatBoxTabSettings.updateTabName(tabID, this.value)
		});

		this.ui.find('.body.small .contentwrapper').append(
			`<div class="content active" data-content="${tabID}"></div>`
		);
		this.ui.find('.body.large .contentwrapper').append(
			`<div class="content active" data-content="${tabID}"></div>`
		);

		ChatBoxSettings.tabOption[tabID] = settings;

		this.tabs[tabID] = tab;
		this.activeTab = tabID;

		this.tabCount++;

		ChatBoxSettings.updateTab(this.activeTab, tabName);
		ChatBoxTabSettings.addTab(this.tabs[tabID])

		return tabID;
	}

	ChatBox.moveTabPosition = function moveTabPosition(tabID) {
		var parentNode = this.ui.find('table.header tr')
		var parentNode2 = this.ui.find('.body.large .tabs .main-tabs')

		var childNode = this.ui.find('table.header tr td.tab[data-tab="' + tabID + '"]')
		var childNode2 = this.ui.find('.body.large .tabs .main-tabs div.tab[data-tab="' + tabID + '"]')

		if ((childNode && this.tabs[tabID]) || (childNode2 && this.tabs[tabID])) {
			childNode.remove()
			childNode2.remove()
			parentNode.prepend(`
			<td class="tab" data-tab="${tabID}">
				<div class="on">
					<input readonly type="text" id="tab-input" value="${this.tabs[tabID].name}"/>
				</div>
			</td>
			`)
			parentNode2.prepend(`
			<div class="tab" data-tab="${tabID}">
				<div class="on">
					<input readonly type="text" id="tab-input" value="${this.tabs[tabID].name}"/>
				</div>
			</div>
			`)

			this.ui.find('table.header tr td.tab[data-tab="' + tabID + '"] div input').on('dblclick', function () {
				var input = ChatBox.ui.find('table.header tr td.tab[data-tab="' + tabID + '"] div input')
				if (input) {
					input.removeAttr('readonly')
					input.focus()
				}
			});
			this.ui.find('.body.large .tabs .main-tabs div.tab[data-tab="' + tabID + '"] div input').on('dblclick', function () {
				var input = ChatBox.ui.find('.body.large .tabs .main-tabs div.tab[data-tab="' + tabID + '"] div input')
				if (input) {
					input.removeAttr('readonly')
					input.focus()
				}
			});



			this.ui.find('table.header tr td.tab[data-tab="' + tabID + '"] div input').on('click', function () {
				ChatBox.switchTab(tabID);
				ChatBox.toggleLargeChatBox(true)

				ChatBoxTabSettings.updateAlerter(tabID, false)
				ChatBox.ui.find('table.header tr td.tab[data-tab="' + tabID + '"] div input').removeClass('blink')
			});
			this.ui.find('.body.large .tabs .main-tabs div.tab[data-tab="' + tabID + '"] div input').on('click', function () {
				ChatBox.switchTab(tabID);

				ChatBox.toggleLargeChatBox(true)

				ChatBoxTabSettings.updateAlerter(tabID, false)
				ChatBox.ui.find('.body.large .tabs .main-tabs div.tab[data-tab="' + tabID + '"] div input').removeClass('blink')
			});



			this.ui.find('table.header tr td.tab[data-tab="' + tabID + '"] div input').on('blur', function () {
				var input = ChatBox.ui.find('table.header tr td.tab[data-tab="' + tabID + '"] div input')
				input.attr('readonly', '')
			});
			this.ui.find('.body.large .tabs .main-tabs div.tab[data-tab="' + tabID + '"] div input').on('blur', function () {
				var input = ChatBox.ui.find('.body.large .tabs .main-tabs div.tab[data-tab="' + tabID + '"] div input')
				input.attr('readonly', '')
			});


			this.ui.find('table.header tr td.tab[data-tab="' + tabID + '"] div input').on('change', function () {
				ChatBox.tabs[tabID].name = this.value;
				ChatBox.ui.find('.large-header .activeTabName').text(this.value)
				ChatBoxTabSettings.updateTabName(tabID, this.value)
			});
			this.ui.find('.body.large .tabs .main-tabs div.tab[data-tab="' + tabID + '"] div input').on('change', function () {
				ChatBox.tabs[tabID].name = this.value;
				ChatBox.ui.find('.large-header .activeTabName').text(this.value)
				ChatBoxTabSettings.updateTabName(tabID, this.value)
			});

			ChatBoxTabSettings.updateCellPosition(tabID)
		}
	}

	ChatBox.switchTab = function switchTab(tabID) {
		var tabName = '';
		var tabName2 = '';

		this.ui.find('table.header tr td.tab div')
			.removeClass('on');
		this.ui.find('.body.large .tabs .main-tabs div.tab div')
			.removeClass('on');
		this.ui.find('.body.small .content')
			.removeClass('active');
		this.ui.find('.body.large .content')
			.removeClass('active');

		this.activeTab = tabID;

		this.ui.find('table.header tr td.tab[data-tab="' + this.activeTab + '"] div')
			.addClass('on');
		this.ui.find('.body.large .tabs .main-tabs div.tab[data-tab="' + this.activeTab + '"] div')
			.addClass('on');
		this.ui.find('.body.small .content[data-content="' + this.activeTab + '"]')
			.addClass('active');
		this.ui.find('.body.large .content[data-content="' + this.activeTab + '"]')
			.addClass('active');

		tabName = this.ui.find('.header tr td div.on input').val();
		tabName2 = this.ui.find('.body.large .tabs .main-tabs div.tab div.on input').val();

		this.ui.find('.large-header .activeTabName').text(tabName2)

		this.ui.find('.content[data-content="' + tabID + '"]').scrollTop = this.ui.find('.content[data-content="' + tabID + '"]').scrollHeight;
		this.ui.find('.body.large .contentwrapper .content[data-content="' + tabID + '"]').scrollTop = this.ui.find('.body.large .contentwrapper .content[data-content="' + tabID + '"]').scrollHeight;

		ChatBoxSettings.updateTab(this.activeTab, tabName);
		if (this.ui.find('.body.large').css('display') !== 'none') {
			ChatBoxSettings.updateTab(this.activeTab, tabName2);
		}
	}

	/**
	 * Once append to HTML
	 */
	ChatBox.onAppend = function OnAppend() {
		// Focus the input
		this.ui.find('.input .message').focus();

		var content = this.ui.find('.content.active');
		var contentLarge = this.ui.find('.body.large .contentwrapper .content.active');
		content[0].scrollTop = content[0].scrollHeight;
		contentLarge[0].scrollTop = contentLarge[0].scrollHeight;
	};


	/**
	 * Stop custom scroll
	 */
	ChatBox.onRemove = function OnRemove() {
		this.ui.find('.content.active').off('scroll');

		_preferences.y = parseInt(this.ui.css('top'), 10) + this.ui.height();
		_preferences.x = parseInt(this.ui.css('left'), 10);
		_preferences.height = _heightIndex;
		_preferences.magnet_top = this.magnet.TOP;
		_preferences.magnet_bottom = this.magnet.BOTTOM;
		_preferences.magnet_left = this.magnet.LEFT;
		_preferences.magnet_right = this.magnet.RIGHT;

		_preferences.tabs = this.tabs;
		_preferences.tabOption = ChatBoxSettings.tabOption;
		_preferences.activeTab = this.activeTab;

		_preferences.save();

		this.lastTabID = -1;
		this.activeTab = 0;
	};


	/**
	 * BattleMode processing
	 *
	 * @param {number} key id to check
	 * @return {boolean} found a shortcut ?
	 */
	ChatBox.processBattleMode = function processBattleMode(keyId) {
		// Direct process
		if (this.ui.find('.battlemode').is(':visible') ||
			KEYS.ALT || KEYS.SHIFT || KEYS.CTRL ||
			(keyId >= KEYS.F1 && keyId <= KEYS.F24)) {
			return BattleMode.process(keyId);
		}
		/*
				var messageBox = this.ui.find('.input .message');
				var text       = messageBox.val();
		
				var messageBoxUser = this.ui.find('.input .username');
				var text2       = messageBoxUser.val();
		
				// Hacky, need to wait the browser to add text in the input
				// If there is no change, send the shortcut.
				Events.setTimeout(function(){
					// Nothing rendered, can process the shortcut
					if ((messageBox.val() === text) && (messageBoxUser.val() === text2)) {
						BattleMode.process(keyId);
					}
				}.bind(this), 4);*/

		return false;
	};


	/**
	 * Key Event Handler
	 *
	 * @param {object} event - KeyEventHandler
	 * @return {boolean}
	 */
	ChatBox.onKeyDown = function OnKeyDown(event) {
		var messageBox = this.ui.find('.input .message');
		var nickBox = this.ui.find('.input .username');
		this.ui.find('.header tr td div.on input').on('keyup', function () {
			ChatBoxSettings.updateTab(ChatBox.activeTab, this.value);
		});
		this.ui.find('.body.large .tabs .main-tabs div.tab div.on input').on('keyup', function () {
			ChatBoxSettings.updateTab(ChatBox.activeTab, this.value);
		});
		switch (event.which) {

			// Battle mode system
			default:
				if ((event.target.tagName && !event.target.tagName.match(/input|select|textarea/i)) || (event.which >= KEYS.F1 && event.which <= KEYS.F24) || KEYS.ALT || KEYS.SHIFT || KEYS.CTRL) {
					if (ChatBox.processBattleMode(event.which)) {
						event.stopImmediatePropagation();
						return false;
					}
				}
				return true;

			// Switch from user name, to message input
			case KEYS.TAB:
				if (document.activeElement === messageBox[0] || document.activeElement === messageBox[1]) {
					if (event.target.id === 'message') {
						nickBox[1].select().focus();
					} else {
						nickBox.select().focus();
					}
					break;
				}

				if (document.activeElement === nickBox[0] || document.activeElement === nickBox[1]) {
					if (event.target.id === 'username') {
						messageBox[1].select().focus();
					} else {
						messageBox.select().focus();
					}
					break;
				}
				return true;

			// Get back message from history
			case KEYS.UP:
				if (!jQuery('#NpcMenu').length) {
					if (document.activeElement === messageBox[0] || document.activeElement === messageBox[1]) {
						if (event.target.id === 'message') {
							messageBox[1].val(_historyMessage.previous()).select();
						} else {
							messageBox.val(_historyMessage.previous()).select();
						}
						break;
					}

					if (document.activeElement === nickBox[0] || document.activeElement === nickBox[1]) {
						if (event.target.id === 'username') {
							nickBox[1].val(_historyNickName.previous()).select();
						} else {
							nickBox.val(_historyNickName.previous()).select();
						}
						break;
					}
				}
				return true;

			// Message from history
			case KEYS.DOWN:
				if (!jQuery('#NpcMenu').length) {
					if (document.activeElement === messageBox[0] || document.activeElement === messageBox[1]) {
						if (event.target.id === 'message') {
							messageBox[1].val(_historyMessage.next()).select();
						} else {
							messageBox.val(_historyMessage.next()).select();
						}
						break;
					}

					if (document.activeElement === nickBox[0] || document.activeElement === nickBox[1]) {
						if (event.target.id === 'username') {
							nickBox[1].val(_historyNickName.next()).select();
						} else {
							nickBox.val(_historyNickName.next()).select();
						}
						break;
					}
				}
				return true;

			// Update chat height
			case KEYS.F10:
				this.updateHeight(false);
				// scroll down when resize
				this.ui.find('.content')[this.activeTab].scrollTop = this.ui.find('.content')[this.activeTab].scrollHeight;
				this.ui.find('.body.large .contentwrapper .content')[this.activeTab].scrollTop = this.ui.find('.body.large .contentwrapper .content')[this.activeTab].scrollHeight;
				break;

			// Send message
			case KEYS.ENTER:
				if (document.activeElement.tagName === 'INPUT' &&
					document.activeElement !== messageBox[0] && document.activeElement !== messageBox[1]) {
					return true;
				}

				if (jQuery('#NpcMenu, #NpcBox').length) {
					return true;
				}

				if (event.target.id === 'message') {
					messageBox[1].focus();
				} else {
					messageBox.focus();
				}

				this.submit(event);
				break;
		}

		event.stopImmediatePropagation();
		return false;
	};

	ChatBox.toggleChat = function toggleChat() {
		var messageBox = this.ui.find('.input .message');

		if (document.activeElement.tagName === 'INPUT' &&
			document.activeElement !== messageBox[0] && document.activeElement === messageBox[1]) {
			return true;
		}

		if (jQuery('#NpcMenu, #NpcBox').length) {
			return true;
		}
		messageBox.focus();
		if (messageBox.length > 0) {
			messageBox[1].focus()
		}
		this.submit();
	}


	/**
	 * Process ChatBox message
	 */
	ChatBox.submit = function Submit(event) {
		var isLargeInput = false;

		if (event && event.target.id && event.target.id.length > 0) {
			isLargeInput = true
		}
		var input = this.ui.find('.input');

		var $user;
		var $text;



		if (isLargeInput === true) {
			$user = this.ui.find('.input #username');
			$text = this.ui.find('.input #message');
		} else {
			$user = input.find('.username');
			$text = input.find('.message');
		}


		var user = $user.val();
		var text = $text.val();
		var isChatOn = false;

		// Battle mode
		if (!text.length) {
			if (isLargeInput === true) {
				input[1].toggle();
			} else {
				input.toggle();
			}

			this.ui.find('.battlemode').toggle();

			if (isLargeInput === true) {
				if (input[1].is(':visible')) {
					isChatOn = true;
					$text.focus();
				}
			} else {
				if (input.is(':visible')) {
					isChatOn = true;
					$text.focus();
				}

			}

			var chatmode = isChatOn ? 'on' : 'off';
			Client.loadFile(DB.INTERFACE_PATH + 'basic_interface/chatmode_' + chatmode + '.bmp', function (data) {
				ChatBox.ui.find('.chat-function .chatmode').css('backgroundImage', 'url(' + data + ')');
			});

			return;
		}

		// Private message
		if (user.length && text[0] !== '/') {
			this.PrivateMessageStorage.nick = user;
			this.PrivateMessageStorage.msg = text;
			_historyNickName.push(user);
			_historyNickName.previous();
		}

		// Save in history
		_historyMessage.push(text);

		$text.val('');

		// Command
		if (text[0] === '/') {
			Commands.processCommand.call(this, text.substr(1));
			return;
		}

		this.onRequestTalk(user, text, ChatBox.sendTo);
	};


	/**
	 * Add text to chatbox
	 *
	 * @param {string} text
	 * @param {number} colorType
	 * @param {string} color
	 * @param {boolean} default false, html or text ?
	 * @param {number} filterType
	 */
	ChatBox.addText = function addText(text, colorType, filterType, color, override) {
		// Backward compatibility for older calls without filter
		if (isNaN(filterType)) {
			filterType = ChatBox.FILTER.PUBLIC_LOG;
		}

		this.tabs.forEach((tab, TabNum) => {
			var content = this.ui.find('.content[data-content="' + TabNum + '"]');
			var chatTabOption = ChatBoxSettings.tabOption[TabNum];

			if (!chatTabOption.includes(filterType)) {
				return;
			}

			if (!color) {
				if ((colorType & ChatBox.TYPE.PUBLIC) && (colorType & ChatBox.TYPE.SELF)) {
					color = '#00FF00';
				}
				else if (colorType & ChatBox.TYPE.PARTY) {
					color = (colorType & ChatBox.TYPE.SELF) ? 'rgb(200, 200, 100)' : 'rgb(230,215,200)';
				}
				else if (colorType & ChatBox.TYPE.GUILD) {
					color = 'rgb(180, 255, 180)';
				}
				else if (colorType & ChatBox.TYPE.PRIVATE) {
					color = '#FFFF00';
				}
				else if (colorType & ChatBox.TYPE.ERROR) {
					color = '#FF0000';
				}
				else if (colorType & ChatBox.TYPE.INFO) {
					color = '#FFFF63';
				}
				else if (colorType & ChatBox.TYPE.BLUE) {
					color = '#00FFFF';
				}
				else if (colorType & ChatBox.TYPE.ADMIN) {
					color = '#FFFF00';
				}
				else if (colorType & ChatBox.TYPE.MAIL) {
					color = '#F4D293';
				}
				else {
					color = 'white';
				}
			}

			content.append(
				jQuery('<div/>').
					css('color', color)
				[!override ? 'text' : 'html'](text)
			);


			// If there is too many line, remove the older one

			var list = this.ui.find('.content');

			if (list.length > MAX_MSG) {
				var element, matches;
				var i, count;

				//Check if theres any blob url object to be released from buffer (Check Controls/ScreenShot.js)
				element = list.eq(0);
				matches = element.html().match(/(blob:[^"]+)/g);

				if (matches) {
					for (i = 0, count = matches.length; i < count; ++i) {
						window.URL.revokeObjectURL(matches[i]);
					}
				}

				element.remove();


			}


			// Function to determine whether to scroll down or not
			function shouldScrollDown(container, messageHeight, height) {
				// Tolerance could be a few pixels to account for nearly at the bottom situations
				const tolerance = 5;

				// The user is considered at the bottom if the current scrollTop, plus the height of the container,
				// plus any potential new message height, is within the tolerance of the total scrollable height.
				const atBottom = container.scrollTop + height + messageHeight >= container.scrollHeight - tolerance;

				// If there is no scrollbar (content does not overflow), or the user is at the bottom, return true.
				if (height >= container.scrollHeight || atBottom) {
					return true;
				}

				// In other cases, return false as we do not want to auto-scroll down
				return false;
			}

			const lastMessageHeightSmall = this.ui.find('.content[data-content="' + TabNum + '"] > div:last-child')[0].scrollHeight;
			const lastMessageHeightLarge = this.ui.find('.content[data-content="' + TabNum + '"] > div:last-child')[1].scrollHeight;

			if (shouldScrollDown(content[0], lastMessageHeightSmall, content.height())) {
				content[0].scrollTop = content[0].scrollHeight;
			}
			if (shouldScrollDown(content[1], lastMessageHeightLarge, this.ui.find('.body.large .contentwrapper .content[data-content="' + TabNum + '"]').height())) {
				content[1].scrollTop = content[1].scrollHeight;
			}

			if (text.length > 0 && TabNum.toString() !== ChatBox.activeTab.toString() && TabNum.toString() !== _preferences.activeTab.toString()) {
				ChatBoxTabSettings.updateAlerter(TabNum, true)
				ChatBox.ui.find('table.header tr td.tab[data-tab="' + TabNum + '"] div input').addClass('blink')
				ChatBox.ui.find('.body.large .tabs .main-tabs div.tab[data-tab="' + TabNum + '"] div input').addClass('blink')

			}
		});

	};


	/**
	 * Change chatbox's height
	 */
	ChatBox.updateHeight = function changeHeight(AlwaysVisible) {
		var HeightList = [0, 0, MAGIC_NUMBER, MAGIC_NUMBER * 2, MAGIC_NUMBER * 3, MAGIC_NUMBER * 4, MAGIC_NUMBER * 5];
		_heightIndex = (_heightIndex + 1) % HeightList.length;

		var content = this.ui.find('.contentwrapper');
		var contentLarge = this.ui.find('.body.large .contentwrapper');
		var height = HeightList[_heightIndex];
		var top = parseInt(this.ui.css('top'), 10);

		this.ui.css('top', top - (height - content.height()));
		content.height(height);
		contentLarge.height(height);

		// Don't remove UI
		if (_heightIndex === 0 && AlwaysVisible) {
			_heightIndex++;
		}

		switch (_heightIndex) {
			case 0:
				this.ui.hide();
				break;

			case 1:
				this.ui.show();
				this.ui.find('.header, .body.small').hide();
				this.ui.find('.input').addClass('fix');
				break;

			default:
				this.ui.find('.input').removeClass('fix');
				this.ui.find('.header, .body.small').show();
				break;
		}

		content[this.activeTab].scrollTop = content[this.activeTab].scrollHeight;
		contentLarge[this.activeTab].scrollTop = contentLarge[this.activeTab].scrollHeight;
	};


	/**
	 * Save user name to nick name history
	 *
	 * @param {string} nick name
	 */
	ChatBox.saveNickName = function saveNickName(pseudo) {
		_historyNickName.push(pseudo);
	};


	/**
	 * Update scroll by block (14px)
	 */
	function onScroll(event) {
		var delta;

		if (event.originalEvent.wheelDelta) {
			delta = event.originalEvent.wheelDelta / 120;
			if (window.opera) {
				delta = -delta;
			}
		}
		else if (event.originalEvent.detail) {
			delta = -event.originalEvent.detail;
		}

		this.scrollTop = Math.floor(this.scrollTop / 14) * 14 - (delta * 14);
		return false;
	}

	/**
	 * Validate the type of information being dropped into the text field
	 */
	function onDropText(event) {
		event.stopImmediatePropagation();
		var data;
		try {
			data = JSON.parse(event.originalEvent.dataTransfer.getData('Text'));
		}
		catch (e) {
			return false;
		}

		// Valid if the message type
		if (data.type == 'item') {
			return false;
		}

		jQuery(event.currentTarget).val(data);
		return true;
	}

	/**
	 * Stop event propagation
	 */
	function stopPropagation(event) {
		event.stopImmediatePropagation();
		return false;
	}



	/**
	 * Change private message nick name
	 *
	 * @param {string} nick name
	 * @return {function} callback closure
	 */
	function onPrivateMessageUserSelection(name) {
		return function onPrivateMessageUserSelectionClosure() {
			ChatBox.ui.find('.input .username').val(name);
		};
	}


	/**
	 * Change target of global chat (party, guild)
	 *
	 * @param {number} type constant
	 */
	function onChangeTargetMessage(type) {
		return function onChangeTargetMessageClosure() {
			var $input = ChatBox.ui.find('.input .message');

			$input.removeClass('guild party');

			if (type & ChatBox.TYPE.PARTY) {
				$input.addClass('party');
			}
			else if (type & ChatBox.TYPE.GUILD) {
				$input.addClass('guild');
			}

			ChatBox.sendTo = type;

			switch (ChatBox.sendTo) {
				case 16:
					ChatBox.ui.find('.input.large .btn.filter button').text('Guild')
					break;
				case 8:
					ChatBox.ui.find('.input.large .btn.filter button').text('Party')
					break;
				default:
					ChatBox.ui.find('.input.large .btn.filter button').text('Public')
					break;
			}
		};
	}

	function makeResizableDiv() {
		const resizers = document.querySelectorAll('.draggable')
		let original_height = 0;
		let original_y = 0;
		let original_mouse_y = 0;
		for (let i = 0; i < resizers.length; i++) {
			const currentResizer = resizers[i];

			currentResizer.addEventListener('mousedown', function (e) {
				e.preventDefault();
				original_height = ChatBox.ui.find('.contentwrapper').height();
				original_y = parseInt(ChatBox.ui.css('top'), 10) + original_height;
				original_mouse_y = e.pageY;
				window.addEventListener('mousemove', resize);
				window.addEventListener('mouseup', stopResize);
			})

			function resize(e) {
				if (currentResizer.classList.contains('draggable')) {
					const height = fixHeight(original_height - (e.pageY - original_mouse_y));
					if (height > MAGIC_NUMBER) {
						ChatBox.ui.css('top', original_y - height);
						ChatBox.ui.find('.contentwrapper').height(height);
					}
				}
				// scroll down when resize
				ChatBox.ui.find('.content')[ChatBox.activeTab].scrollTop = ChatBox.ui.find('.content')[ChatBox.activeTab].scrollHeight;
				ChatBox.ui.find('.body.large .contentwrapper .content')[ChatBox.activeTab].scrollTop = ChatBox.ui.find('.body.large .contentwrapper .content')[ChatBox.activeTab].scrollHeight;
			}

			function fixHeight(height) {
				return Math.floor(height / MAGIC_NUMBER) * MAGIC_NUMBER;
			}

			function stopResize() {
				window.removeEventListener('mousemove', resize);
			}
		}
	}


	/**
	 * Create componentand export it
	 */
	return UIManager.addComponent(ChatBox);
});
