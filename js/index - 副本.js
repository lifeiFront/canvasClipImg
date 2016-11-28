(function($, undefined) {
	function getQueryArgs() {
		//取得查询字符串并去掉开头的问号，location.search返回?以后的字符串
		var qs = (location.search.length > 0 ? location.search.substring(1) : ""),
			args = {},
			items = qs.length ? qs.split("&") : [],
			item = null,
			name = null,
			value = null,
			i = 0,
			len = items.length;
		//逐个将每一项添加到args对象中
		for (i = 0; i < len; i++) {
			item = items[i].split("=");
			//url后的参数浏览器会对其进行编码（encodeURIComponent），此处进行解码操作。
			name = decodeURIComponent(item[0]);
			value = decodeURIComponent(item[1]);
			if (name.length) {
				args[name] = value;
			}
		}
		return args;
	};
	if (getQueryArgs().dev == 'weinre') {
		(function(e) {
			e.setAttribute("src", "http://10.129.232.130:8686/target/target-script-min.js#anonymous");
			document.getElementsByTagName("body")[0].appendChild(e);
		})(document.createElement("script"));
	}
	/**
	 * [uploadImg 针对移动端图片裁切，利用canvas生成裁切图像，异步发送给后台。裁剪框固定不变（移动端裁剪框操作不方便），可以翻转变动图片。]
	 * 搜索上传会涉及跨域问题，解决方案：1、将网络图片后台获取到自己的服务器。2、在图片服务器设置允许本网站跨域
	 * 上传的原理基本相同，本示例只介绍本地图片预览上传
	 * 注意点：只需要关注位移，并非图片左上角的坐标，而是图片左右上下滑动的距离，后面缩放会将图片正常话
	 */
	var uploadImg = {
		url: '', //图片url
		imgObj: '',
		naturalWidth: '', //图片的原始宽度
		naturalHeight: '', //图片的原始高度
		rotate: 0, //图片的旋转角度
		initScale: 1, //图片的缩放比例
		initRotate:'',
		countRotate:30,//旋转角度总数
		x: 0, //图片的相对（相对裁剪框左上角的坐标）位移
		y: 0, //图片的相对（相对裁剪框左上角的坐标）位移
		clipWith:$('#clipbox').width(),
		clipHeight:$('#clipbox').height(),
		clipx: $('#clipbox').offset().left,
		clipy: $('#clipbox').offset().top,
		init: function() {
			this.bindEvent();
			// Transform($('#editImg')[0]);
		},
		bindEvent: function() {
			var _this = this;
			$(document).on('change', '#fileSelect', function(event) {
				event.preventDefault();
				_this.getImgUrl(this.files[0]);
			});
			$(document).on('click', '#submit', function(event) {
				event.preventDefault();
				_this.clipImg();
			});
		},
		clipImg: function() {
			var _this = this;
			if (!_this.imgObj) return;
			var canvas = $('<canvas width="' + _this.clipWith + '" height="' + _this.clipHeight + '"></canvas>')[0],
				context = canvas.getContext('2d');
			var tempX =  _this.naturalWidth/2-Math.cos((_this.initRotate+_this.countRotate)*Math.PI/180)*Math.sqrt(_this.naturalWidth*_this.naturalWidth+_this.naturalHeight*_this.naturalHeight)/2;
			var tempY =  _this.naturalHeight/2-Math.sin((_this.initRotate+_this.countRotate)*Math.PI/180)*Math.sqrt(_this.naturalWidth*_this.naturalWidth+_this.naturalHeight*_this.naturalHeight)/2;
			
			
			// context.scale(_this.initScale,_this.initScale);
			context.translate(_this.x+tempX, _this.y+tempY);
			context.rotate(_this.countRotate * Math.PI / 180);
			//平移 旋转
			context.drawImage(_this.imgObj, 0, 0, _this.naturalWidth*_this.initScale,  _this.naturalHeight*_this.initScale);
			$('#temp')[0].src = canvas.toDataURL();
		},
		getImgUrl: function(file) {
			var _this = this;
			var reader = new FileReader();
			reader.onload = function() {
				// 通过 reader.result 来访问生成的 DataURL
				var url = reader.result;
				_this.setImgUrl(url);
			};
			reader.onerror = function() {};

			reader.readAsDataURL(file);
		},
		setImgUrl: function(url) {
			var _this = this;
			var img = new Image();
			img.onload = function() {
				_this.url = url;
				_this.naturalWidth = this.width;
				_this.naturalHeight = this.height;
				_this.initRotate = 180*Math.atan(_this.naturalHeight/_this.naturalWidth)/Math.PI;
				$('#editImg').attr('src', url).css({
					position: 'absolute',
					top: _this.clipy,
					left: _this.clipx,
					width: _this.naturalWidth
				}).show();
				_this.imgObj = $('#editImg')[0];
				_this.finger();
				// _this.picLeft = $('.edit-main').offset().left;
				// _this.picTop = $('.edit-main').offset().top;
			};
			img.onerror = function() {
				alert('读取图片失败, 请您重新选择选择图片或重试');
			};
			img.src = url;
		},
		finger: function() {
			var _this = this;
			_this.initScale = 1;
			var temp = 0;
			new AlloyFinger($('#clipbox')[0], {
				touchStart: function() {},
				touchMove: function() {},
				touchEnd: function() {},
				touchCancel: function() {},
				multipointEnd: function() {},
				tap: function() {},
				doubleTap: function() {},
				longTap: function() {},
				singleTap: function() {},
				rotate: function(evt) {
					// evt.angle//角度变化值
					// _this.imgObj.rotateZ += evt.angle;
					// _this.imgObj.rotateZ//旋转的角度
				},
				multipointStart: function() {
					// _this.initScale = _this.imgObj.scaleX;
				},
				pinch: function(evt) {
					console.log(_this.initScale);
					_this.initScale = _this.initScale * evt.scale;
					$(_this.imgObj).css({
						width: _this.initScale * _this.naturalWidth,
					});
					// _this.imgObj.scaleX = _this.imgObj.scaleY = _this.initScale * evt.scale;
				},
				pressMove: function(evt) {
					var left = Number.parseInt($(_this.imgObj).css('left'));
					var top = Number.parseInt($(_this.imgObj).css('top'));
					_this.x += evt.deltaX;
					_this.y += evt.deltaY;
					console.log(_this.x+'=='+_this.y);
					$(_this.imgObj).css({
						left: left + evt.deltaX,
						top: top + evt.deltaY
					});
					// _this.imgObj.translateX += evt.deltaX;
					// _this.imgObj.translateY += evt.deltaY;
					evt.preventDefault();
				},
				swipe: function(evt) {
					console.log("swipe" + evt.direction);
				}
			});
		}
	};
	uploadImg.init();
})(Zepto);