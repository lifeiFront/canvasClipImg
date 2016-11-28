(function($, undefined) {
	function getQueryArgs() {//获取链接后的查询字符串，与图片裁切无关代码
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
	if (getQueryArgs().dev == 'weinre') {//用weinre工具在移动端进行调试，与图片裁切无关代码
		(function(e) {
			e.setAttribute("src", "http://10.129.232.130:8686/target/target-script-min.js#anonymous");
			document.getElementsByTagName("body")[0].appendChild(e);
		})(document.createElement("script"));
	}

	function ease(x) {
		return Math.sqrt(1 - Math.pow(x - 1, 2));
	}
	/**
	 * [uploadImg 针对移动端图片裁切，利用canvas生成裁切图像，异步发送给后台。裁剪框固定不变（移动端裁剪框操作不方便），可以翻转变动图片。]
	 * 搜索上传会涉及跨域问题，解决方案：1、将网络图片后台获取到自己的服务器。2、在图片服务器设置允许本网站跨域
	 * 上传的原理基本相同，本示例只介绍本地图片预览上传
	 * 注意点：1、只需要关注位移，并非图片左上角的坐标，而是图片左右上下滑动的距离，后面缩放会将图片正常话
	 * 		   2、图片初始时左上角与裁剪框对齐（方便计算初始偏移量值）
	 * 		   3、图片旋转始终以图片中心做旋转，以图片中心点计算图片旋转是的左上角偏移量。（以其他点旋转也可以，但要始终以同一个点，不然计算偏移量很麻烦）
	 * 		   4、图片缩放已图片左上角为中心缩放，旋转后的缩放也要以原始左上角缩放。（通过控制图片宽高可以实现始终以原始左上角做缩放）（以其他点缩放要始终保持一个点，不然偏移量计算会有问题）
	 */
	var uploadImg = {
		clipbox: $('#clipbox'), //裁剪框对象
		finger: null, //手势对象
		scaleSpeed:0.5,//缩放速度控制
		oldRotate:0,//旋转前的角度
		url: '', //图片url
		imgObj: '', //当前操作的图片对象
		naturalWidth: '', //图片的原始宽度
		naturalHeight: '', //图片的原始高度
		initScale: 1, //图片的缩放比例
		initRotate: '', //图片的初始角度，此处的角度是计算图片旋转是左上角相对裁剪框偏移量的
		countRotate: 0, //图片旋转过程中的旋转角度
		x: 0, //图片的相对（相对裁剪框左上角的坐标）位移
		y: 0, //图片的相对（相对裁剪框左上角的坐标）位移
		clipWith: $('#clipbox').width(),
		clipHeight: $('#clipbox').height(),
		clipx: $('#clipbox').offset().left, //裁剪框相对body的偏移量
		clipy: $('#clipbox').offset().top,
		init: function() {
			this.bindEvent();
			this.finger();
		},
		bindEvent: function() {
			var _this = this;
			$(document).on('change', '#fileSelect', function(event) {
				event.preventDefault();
				_this.getImgUrl(this.files[0]);
			});
			$(document).on('click', '#submit', function(event) {
				event.preventDefault();
				_this.clipImg(); //裁切
			});
		},
		getSkewXY: function() { //获取画布应该的偏移量
			var _this = this;
			//保证图片的缩放是已左上角为中心点，此处的缩放是通过控制图片的width值进行的，可以保证以左上角为中心的。
			//如果css中控制了图片的缩放是图片中心点，也可以进行计算，可能方式不大一样。
			//缩放操作可以用scale,在手势插件中的scalex进行控制时，缩放的中心点是不定的，根据手势的变化而变化，无法进行计算，
			//如果此处的样式可以自己控制中心点，也可以用css中的scale进行缩放控制。
			//暂时用了width属性进行了缩放控制（重点是要获取图片左上角相对于裁剪区的坐标位置）
			//图片缩放后的偏移量计算
			var tempW = _this.naturalWidth * _this.initScale,
				tempH = _this.naturalHeight * _this.initScale,
				diagonal = Math.sqrt(tempW * tempW + tempH * tempH) / 2, //对角线长度的一半

				//此处计算的是按照初始宽高计算旋转后的偏移量
				tempX = tempW / 2 - Math.cos((_this.initRotate + _this.countRotate) * Math.PI / 180) * diagonal,
				tempY = tempH / 2 - Math.sin((_this.initRotate + _this.countRotate) * Math.PI / 180) * diagonal;

			return {
				x: _this.x + tempX,
				y: _this.y + tempY
			};
		},
		clipImg: function() {
			var _this = this;
			if (!_this.imgObj) return;
			//canvas的宽高与裁剪框保持一致
			var canvas = $('<canvas width="' + _this.clipWith + '" height="' + _this.clipHeight + '"></canvas>')[0],
				context = canvas.getContext('2d');
			// 计算图片旋转时，左上角坐标相对画布圆点的偏移量
			var temp = _this.getSkewXY();
			//先平移在旋转
			//canvas对象不变，画布平移，使得画布的左上角与图片位于同一个点，然后旋转画布，达到裁剪看中看到的图片部分与canvas绘制的部分一致
			context.translate(temp.x, temp.y);
			//图片的旋转是按照图片中心点旋转，而画布旋转是基于左上角旋转，所以需要先计算偏移量，在旋转
			//最终的结果要使得隐藏canvas窗口中的图片部分与页面中可视的裁剪框可见的图片部分保持一致，才能得到正确的裁剪图片
			context.rotate(_this.countRotate * Math.PI / 180);
			//此处绘图，绘制图片起始点0,0，因为上面画布已经做了便宜，此处不需在处理。将图像绘制在调整后的画布上
			context.drawImage(_this.imgObj, 0, 0, _this.naturalWidth * _this.initScale, _this.naturalHeight * _this.initScale);
			//预览裁切后的图像
			$('#temp')[0].src = canvas.toDataURL();
			// 将canvas裁切的图片已大对象的形式通过异步请求传给后台保存
			// canvas.toBlob(function(blob){
			//     var formData = new FormData();
			//     formData.append('pic', blob);
			//     formData.append('lemmaId', _this.getQueryItem('lemmaId'));
			//     formData.append('width', _this.clipWith);
			//     formData.append('height',_this.clipHeight);

			//     $.ajax({
			//         type: 'POST',
			//         url: '/baike/wireless/edit',
			//         data: formData,
			//         dataType: 'json',
			//         contentType: false,
			//         processData: false,
			//         cache: false,
			//         success: function(data){
			//         },
			//         complete: function(){
			//         }
			//     });
			// }, 'image/jpeg', 0.85);
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
			img.onload = function() { //新图加载后，必要的参数回复初始值
				//回复初始值
				_this.initScale = 1;
				_this.x = 0;
				_this.y = 0;
				_this.countRotate = 0;
				_this.url = url;
				_this.naturalWidth = this.width;
				_this.naturalHeight = this.height;
				_this.initRotate = 180 * Math.atan(_this.naturalHeight / _this.naturalWidth) / Math.PI;
				$('#editImg').remove();
				$('body').prepend('<img id="editImg" src="' + url + '" style="position: absolute;width:' + _this.naturalWidth + 'px;top:' + _this.clipy + 'px;left:' + _this.clipx + 'px">');

				_this.imgObj = $('#editImg')[0];
				Transform(_this.imgObj); //动画加速。可以不用此js插件，动画效果可以自己放到css样式文件中编写。样式人员配合
			};
			img.onerror = function() {
				alert('读取图片失败, 请您重新选择选择图片或重试');
			};
			img.src = url;
		},
		finger: function() {
			var _this = this;
			_this.finger = new AlloyFinger($('#clipbox')[0], {
				touchStart: function() {
				},
				touchMove: function() {},
				touchEnd: function() {},
				touchCancel: function() {},
				multipointEnd: function(evt) {
					_this.initScale = _this.initScale+(evt.scale-1)*_this.scaleSpeed;
					To.stopAll();
					if(Math.abs(_this.countRotate-_this.oldRotate)>5){//可控制旋转的角度值,一次选择<5不做旋转
						_this.oldRotate = _this.countRotate;
					}else{
						_this.countRotate = _this.oldRotate;
					}
					new To(_this.imgObj, "rotateZ", _this.oldRotate, 500, ease);
				},
				tap: function() {},
				doubleTap: function(evt) { //可进行图片还原
					// To.stopAll();
					// new To(el, "rotateZ", 0, 500, ease);
					// new To(_this.imgObj, "scaleX", 1000, 500, ease);
					// new To(_this.imgObj, "scaleY", 1, 500, ease);
					// new To(_this.imgObj, "translateX", 0, 500, ease);
					// new To(_this.imgObj, "translateY", 0, 500, ease);
				},
				longTap: function() {},
				singleTap: function() {},
				rotate: function(evt) {
					_this.imgObj.rotateZ += evt.angle;
					_this.countRotate = _this.imgObj.rotateZ;
				},
				multipointStart: function() {

				},
				pinch: function(evt) {
					// evt.scale//缩放比例
					// 缩放是通过控制图片的width值进行的，可以保证以左上角为中心的。如果不是左上角为中心店，计算偏移量会出错
					$(_this.imgObj).css({
						width: (_this.initScale+(evt.scale-1)*_this.scaleSpeed) * _this.naturalWidth
					});
					// _this.imgObj.scaleX = _this.imgObj.scaleY = _this.initScale * evt.scale;
				},
				pressMove: function(evt) {
					evt.preventDefault();
					_this.x += evt.deltaX;
					_this.y += evt.deltaY;
					_this.imgObj.translateX += evt.deltaX;
					_this.imgObj.translateY += evt.deltaY;
				},
				swipe: function(evt) {
					console.log("swipe" + evt.direction);
				}
			});
		}
	};
	uploadImg.init();
})(Zepto);
