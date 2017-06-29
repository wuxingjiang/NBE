(function (window) {
    // 验证浏览器对range的支持
    if(!document.createRange || typeof document.createRange !== 'function') {
        alert('当前浏览器不支持document.createRange,')
        return;
    }
})(window);

// 构造函数
(function (window, $) {
    // 定义构造函数
    var Editor = function (textareaId) {
        var self = this;

        self.$body = $('body');

        // textarea
        var $textarea = $('#' + textareaId);
        self.$textarea = $textarea;

        // 记录每一个tap事件的时间，防止短时间内重复tap
        self.checkTapTime = function(e, info) {
            var type = e.type.toLowerCase();
            var currentElem;
            var $currentElem;
            var result = true;

            if(type.indexOf('tap') < 0) {
                // 其他时间不管
                return result
            }

            if(e) {
                // 传入 event对象，则为每个event对象分配时间
                currentElem = e.currentTarget || e.target;
                $currentElem = $(currentElem);
            } else {
                // 未传入，则都用body
                $currentElem = self.body;
            }

            if($currentElem.data('tapTime') == null) {
                // 第一次直接通过
                $currentElem.data('tapTime', Date.now().toString());
                result = true;
            } else {
                if(Date.now() - parseInt($currentElem.data('tapTime')) < 100) {
                    // 如果当前时间和上次的taptime相差 100ms之内
                    // 则视为无效，并且阻止时间冒泡和默认行为
                    e.preventDefault();
                    e.stopPropagation();
                    result = false;
                }else {
                    // 否则就更新tapTime的事假n
                    $currentElem.data('tapTime', Data.now().toString());
                    result = true;
                }
            }

            return result;
        };

        // 初始化编辑器对象的默认配置 暂时没有
        // self.initDefaultConfig();
       
       // 初始化编辑区域的配置
        self.textareaInit()
    }

     // 暴露全局函数
    window._$$_E = Editor;

    // 初始化编辑区域的配置
    Editor.prototype.textareaInit = function () {
        console.log('初始化编辑区域的配置')
        var self = this;
        var $textarea = self.$textarea;
        var val = $.trim($textarea.val());

        //编辑区域（将textarea的值，直接复制过来）
        var $txt = $('<div contentEditable="true" class="wuEditor-mobile-txt">' + val + '</div>');

        // mobile comtainer
        // var $modalContainer = $('<div class="wuEditor-mobile-container"></div>');

        //记录对象中
        self.$txt = $txt;
        // self.$modalContainer = $modalContainer;

        //最后插入一个空行
        self.insertEmpltyLink();
    };
    // 绑定编辑区事件
    Editor.prototype.bindTxtEvent = function () {
        var self = this;
        var $txt = self.$txt;
        var srollTime = Date.now();

        // 处理点击 $TXT 的选区
        // $txt 的tap 事件中调用
        function selectionHeader () {
            var focusElem;
            var $focusElem;
            // 保存选中区域
            self.saveSelection();
        }

        // tap时，记录选区，
		$txt.on('focus', function () {
			// 记录编辑器区域已经focus
			self.isFocus = true;
		});

        // change 
        $txt.on('keyup', function () {
            self.change && self.change() 
        })
    };
    Editor.prototype.command = function (commandName, bool, commandValue, e, callback) {
		var self = this;
        var regRestoreNoWrapSelection = /insertimage/i;
		// 验证该命令是否不能恢复外围选区，将传入到 customCommand 中
		var regResult = regRestoreNoWrapSelection.test(commandName);

		var fn = function () {
			document.execCommand(commandName, !!bool, commandValue);
		};

		// 执行事件
		self.customCommand(regResult, fn, e, callback);
	};

     Editor.prototype.customCommand = function (isRestoreNoWrapSelection, fn, e, callback) {
		var self = this;
		var currentRange = self.currentRange();
		var currentWrapRange = self.currentWrapRange();
		var $txt = self.$txt;

		/*
			isRestoreNoWrapSelection 参数的作用：
			1. 有些 command 是需要选中整个外围选区再进行操作的，一般是修改样式，例如加粗。
			   针对加粗这种样式操作，如果不默认选中一个选区，是看不到任何效果的。
			2. 但是有些 command 一定不能选中外围选区，一般是插入操作，例如插入图片。
			   如果选中了一段区域，再执行插入图片，插入图片之后，刚才的那段选区就没有了。

			因此，isRestoreNoWrapSelection 的作用就是来判断，是否要选中外围选区。
		*/
		if (isRestoreNoWrapSelection) {
			// 恢复选区（非整个外围选区）
			self.restoreSelection(currentRange);
		} else {
			// 恢复选区（整个外围选区）
			self.restoreSelection(currentWrapRange);
		}

		// 执行命令
		fn();

		// 如果 $txt 最后没有空行，则增加一个
		self.insertEmpltyLink();

		// 重新保存选区，因为部分浏览器会自动清空选区
		self.saveSelection();

		// 恢复选区（非外围选区）
		self.restoreSelection(currentRange);

		// 阻止默认行为，阻止冒泡
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}

		// 回调函数
		if (callback) {
			callback.call(self);
		}

        // 触发changge事件
        self.change && self.change()
	};

    // 恢复选中区域
    Editor.prototype.restoreSelection = function (range){
		var selection;

		if (!range) {
			return;
		}

		selection = document.getSelection();
		selection.removeAllRanges();
		selection.addRange(range);
	};

    // 设置或读取当前的range
	Editor.prototype.currentRange = function (cr){
		if (cr) {
			this.currentRangeData = cr;
		} else {
			return this.currentRangeData;
		}
	};

	// 设置或读取当前range的wrapRange
	Editor.prototype.currentWrapRange = function (cwr){
		if (cwr) {
			this.currentWrapRangeData = cwr;
		} else {
			return this.currentWrapRangeData;
		}
	};

	// 获取 wrapRange 的元素（不能是text类型） 
	Editor.prototype.getWrapRangeElem = function () {
		var self = this;
		var $txt = self.$txt;
		var txtClass = $txt.attr('class');     // 获取编辑区域的class

		var wrapRange = this.currentWrapRange();
		var elem;
		var resultElem;

		var eventTargetElem = self.eventTarget().get(0);

		if (wrapRange == null) {
			return;
		}

		// 获取 range 的包含元素
		elem = wrapRange.commonAncestorContainer;

		if (elem.nodeType === 3) {
			// text类型，获取父元素
			resultElem = elem.parentNode;
		} else {
			// 不是 text 类型
			resultElem = elem;
		}

		// 判断 resultElem 是不是 $txt （通过 class 判断）
		if (resultElem.className === txtClass) {
			// 如果 resultElem 正好是 $txt
			// 则将 resultElem 试图设置为 $txt 最后一个子元素
			resultElem = $txt.children().last().get(0) || resultElem;
		}

		// 返回
		return resultElem;
	};


    // 保存选择区域
    Editor.prototype.saveSelection = function (range) {
        var self = this,
        _parentElem,
        selection,
        wrapRange,
        txt = self.$txt.get(0);

        if(range) {
            _parentElem = range.commonAncestorContainer;
        }else {
            selection = document.getSelection();
            if(selection.getRangeAt && selection.rangeCount) {
                range = selection.getRangeAt(0);
                _parentElem = range.commonAncestorContainer;
            }
        }

        // 确定父元素一定要包含在编辑器区域内
		if (_parentElem && (txt.contains(_parentElem) || txt === _parentElem) ) {

			// 保存选择区域
			self.currentRange(range);

			// 保存 wrapRange
			wrapRange = document.getSelection().getRangeAt(0);
			wrapRange.selectNodeContents(_parentElem);
			self.currentWrapRange(wrapRange);
		}
    };

    //渲染编辑器区域
    Editor.prototype.renderTxt = function () {
        var self = this;
        var $textarea = self.$textarea;
        var $txt =self.$txt;
        // var $modalContainer = self.$modalContainer;
        var $body = self.$body;

        $textarea.after($txt);
        $textarea.hide();
        // $body.append($modalContainer)
    };

    // 给最后插入一个空行
    Editor.prototype.insertEmpltyLink = function () {
        console.log('给最后插入一个空行')
        var self = this;
        var $txt = self.$txt;
        var $chileren = $txt.children();

        if($chileren.length === 0) {
            $txt.append($('<p><br></p>'));
            return;
        };

        if($chileren.last().html() !== '<br>') {
            $txt.append($('<p><br></p>'));
        };
    };
    // 初始化编辑器对象
    Editor.prototype.init = function () {
        var self = this;
        
        //渲染编辑区域
        self.renderTxt();
        // 绑定编辑区事件
        self.bindTxtEvent();
    };
    
})(window, window.Zepto)