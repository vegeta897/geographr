/* Canvas drawing service */

angular.module('Geographr.canvas', [])
.factory('canvasUtility', function(colorUtility) {
    var pixSize = 5;
    var pixOff = pixSize/2;
    return {
        fillCanvas: function(context,color) {
            var method = color == 'erase' ? 'clearRect' : 'fillRect';
            if(color != 'erase') { context.fillStyle = color.charAt(0) == 'r' ? color : '#' + color; }
            context[method](0,0,1200,750);
        },
        drawPixel: function(context,color,coords,size) {
            var method = color == 'erase' ? 'clearRect' : 'fillRect';
            var x = parseInt(coords[0]), y = parseInt(coords[1]);
            if(color != 'erase') { context.fillStyle = color.charAt(0) == 'r' ? color : '#' + color; }
            context[method](x*pixSize,y*pixSize,size[0]*pixSize,size[1]*pixSize);
        },
        drawSelect: function(context,coords,pixSize) {
            var x = coords[0], y = coords[1];
            context.beginPath();
            context.moveTo(x * pixSize + pixOff, y * pixSize - 4.5);
            context.lineTo(x * pixSize + pixOff, y * pixSize + pixSize + 4.5);
            context.moveTo(x * pixSize - 4.5, y * pixSize + pixOff);
            context.lineTo(x * pixSize + pixSize + 4.5, y * pixSize + pixOff);
            context.strokeStyle = 'rgba(255,255,255,0.5)';
            context.stroke();
            context.clearRect(x * pixSize, y * pixSize, // Inner box
                pixSize, pixSize);
        },
        drawPing: function(context,coords) {
            var pingGradient = context.createRadialGradient(
                coords[0]*pixSize + pixSize/2, coords[1]*pixSize + pixSize/2, 5,
                coords[0]*pixSize + pixSize/2, coords[1]*pixSize + pixSize/2, 0
            );
            pingGradient.addColorStop(0, "rgba(255, 255, 255, 0)");
            pingGradient.addColorStop(0.2, "rgba(255, 255, 255, 1)");
            pingGradient.addColorStop(0.4, "rgba(255, 255, 255, 0)");
            pingGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
            context.fillStyle = pingGradient;
            context.beginPath();
            context.arc(coords[0]*pixSize + pixSize/2,
                coords[1]*pixSize + pixSize/2, 5, 0, 2 * Math.PI, false);
            var cycle = 0;
            function fadePing() {
                if(Math.round(cycle/2) == cycle/2) {
                    context.fill();
                } else {
                    context.clearRect(coords[0] * pixSize - 15 + pixSize/2,
                        coords[1] * pixSize - 15 + pixSize/2, 30, 30);
                }
                cycle++;
                if(cycle >= 8) {
                    clearInterval(pingInt);
                }
            }
            var pingInt = setInterval(function(){fadePing()},200);
        },
        clearPing: function(context,coords) {
            context.clearRect(coords[0] * pixSize - 15 + pixSize/2,
                coords[1] * pixSize - 15 + pixSize/2, 30, 30);
        }
    }
});