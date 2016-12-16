# canvasClipImg
利用canvas裁切图片，可任意缩放旋转图片进行裁切，裁切预览，代码注释清晰，可根据需求自己二次开发。

---

### 一、功能描述
    canvas无线图片裁切功能，支持图片上传，裁切预览，图片任意角度旋转缩放裁切，异步上传图片。代码注释清晰。

### 二、注意事项 
1.只需要关注位移，并非图片左上角的坐标，而是图片左右上下滑动的距离，后面缩放会将图片正常话。

2.图片初始时左上角与裁剪框对齐（方便计算初始偏移量值）。

3.图片旋转始终以图片中心做旋转，以图片中心点计算图片旋转是的左上角偏移量。（以其他点旋转也可以，但要始终以同一个点，不然计算偏移量很麻烦）。

4.图片缩放已图片左上角为中心缩放，旋转后的缩放也要以原始左上角缩放。（通过控制图片宽高可以实现始终以原始左上角做缩放）（以其他点缩放要始终保持一个点，不然偏移量计算会有问题）。

5.canvas不要绘制一整张等高等宽的图片，会比较耗时（即：画布宽高，图片宽高，canvas宽高一样，绘制整张高清图）。图片操作用样式控制，最后裁切，在canvas的上下文环境也就是画布中绘制整张图片没性能问题，只要在canvas标签中显示的图片是整张图片的部分就不会太耗性能。

6.canvas 的toBlob方法要做兼容处理。
*搜索上传为实现，实现方式与本地图片类似，代码中有注释说明，页面的样式风格是项目中用到的样式风格。具体样式可自行设计。字体样式文件也是本项目用到的字体图标，与图片裁切功能关系不大。静态页中的裁剪框，可以用canvas画布画出一个，减少页面样式布局的复杂度（可参考[alloy_finger](https://github.com/AlloyTeam/AlloyFinger)项目中的图片裁切示例。）*

### 三、关键代码
``` javascript
      getSkewXY: function() { //获取画布需要的偏移量方法
			var _this = this;
			//保证图片的缩放是已左上角为中心点，此处的缩放是通过控制图片的width值进行的，可以保证以左上角为中心的。
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
		}
    
    clipImg: function() {//裁切图片方法
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
			// 将canvas裁切的图片已大对象的形式通过异步请求传给后台保存,与后台自行配合实现
			//canvas.toBlob(function(blob){//canvas转换成大对象，作为文件存储
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
		}
```


### 四、参考资料
[alloy_finger.js](https://github.com/AlloyTeam/AlloyFinger)移动端小巧的手势库（代码库中有一个腾讯应用的图片上传示例，不过不支持图片旋转）

[tansform.js](https://github.com/AlloyTeam/AlloyFinger/tree/master/transformjs)与手势库在同一个项目下
