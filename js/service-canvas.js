/* Canvas drawing service */

angular.module('Geographr.canvas', [])
.factory('canvasUtility', function(colorUtility) {
        var pixSize = 5;
        var pixOff = pixSize/2;
        
        // Return a list of coordinates surrounding and including the input coords
        var listNear = function(coords) {
            coords[0] = parseInt(coords[0]); coords[1] = parseInt(coords[1]);
            var near = [];
            for(var i = -1; i < 2; i++) {
                for(var ii = -1; ii < 2; ii++) {
                    near.push((coords[0] + i) + ':' + (coords[1] + ii));
                }
            }
            return near;
        };
        var surveyNear = function(near,terrain) {

            /*
            land
                #3c5d2c
                #466b35
                #527d3e
                #6a8c46
                #889e56
                #aeac66

            water
                #628c76
                #47796e
                #395e61
                #334f57
                #2e454f
            */
            var color = '';
            var type = terrain[near[4]] == 'land' ? 'land' : 'water';
            var landNear = 0;
            for(var i = 0; i < near.length; i++) {
                if(terrain.hasOwnProperty(near[i])) {
                    if(terrain[near[i]] == 'land') {
                        if(i == 0 || i == 2 || i == 6 || i == 8) {
                            landNear += 10;
                        } else if(i == 1 || i == 3 || i == 5 || i == 7) {
                            landNear += 15;
                        }
                    }
                }
            }
            if(type == 'land') {
                if(landNear >= 95) { color = '#3c5d2c'; }
                else if(landNear >= 90) { color = '#466b35'; }
                else if(landNear >= 80) { color = '#527d3e'; }
                else if(landNear >= 70) { color = '#6a8c46'; }
                else if(landNear >= 60) { color = '#889e56'; }
                else { color = '#aeac66'; }
            } else {
                if(landNear >= 90) { color = '#628c76'; }
                else if(landNear >= 65) { color = '#47796e'; }
                else if(landNear >= 40) { color = '#395e61'; }
                else if(landNear >= 15) { color = '#334f57'; }
                else if(landNear >= 10) { color = '#2e454f'; }
                else { color = '#2c3d4b'; }
            }
            return color;
        };
            
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
            drawTerrain: function(context,type,coords,terrain) {
                var affected = listNear(coords);
                for(var i = 0; i < affected.length; i++) {
                    var thisCoord = affected[i].split(':');
                    var nearThis = listNear(thisCoord);
                    var color = surveyNear(nearThis,terrain);
                    var x = parseInt(thisCoord[0]), y = parseInt(thisCoord[1]);
                    context.fillStyle = color;
                    context.fillRect(x*pixSize,y*pixSize,pixSize,pixSize);
                }
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