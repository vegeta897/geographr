/* Canvas drawing service */

angular.module('Geographr.canvas', [])
.factory('canvasUtility', function(colorUtility) {
        var mainPixSize = 2;
        var mainPixOff = mainPixSize/2;
        
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
            var color = '';
            var type = terrain[near[4]] > 0 ? terrain[near[4]] : 0;
            var landNear = 0;
            var nearHeight = 0;
            for(var i = 0; i < near.length; i++) {
                if(terrain.hasOwnProperty(near[i])) {
                    if(terrain[near[i]] > 0) {
                        if(i == 0 || i == 2 || i == 6 || i == 8) {
                            landNear += 10;
                        } else if(i == 1 || i == 3 || i == 5 || i == 7) {
                            landNear += 15;
                            if(i == 1 || i == 3) {
                                nearHeight += terrain[near[i]];
                            }
                        }
                    }
                }
            }
            if(type > 0) {
                if(landNear >= 95) { color = {r:60,g:93,b:44}; }
                else if(landNear >= 90) { color = {r:70,g:107,b:53}; }
                else if(landNear >= 80) { color = {r:82,g:125,b:62}; }
                else if(landNear >= 70) { color = {r:106,g:140,b:70}; }
                else if(landNear >= 60) { color = {r:136,g:158,b:86}; }
                else { color = {r:174,g:172,b:102}; }
            } else {
                if(landNear >= 90) { color = {r:98,g:140,b:118}; }
                else if(landNear >= 65) { color = {r:71,g:121,b:110}; }
                else if(landNear >= 40) { color = {r:57,g:94,b:97}; }
                else if(landNear >= 15) { color = {r:51,g:79,b:87}; }
                else if(landNear >= 10) { color = {r:46,g:69,b:79}; }
                else { color = {r:44,g:61,b:75}; }
            }
            var factor = 0, diff = {};
            if(terrain[near[4]] > 1) { // Draw brown mountains
                factor = (terrain[near[4]]-1)/8;
                diff = {r:color.r - 88,g:color.g - 93, b:color.b - 70};
                color = {r:color.r - diff.r*factor,g:color.g - diff.g*factor,b:color.b - diff.b*factor};
            }
            if(terrain[near[4]] > 6) { // Draw white peaks
                factor = (terrain[near[4]]-9)/8;
                diff = {r:color.r - 144,g:color.g - 144, b:color.b - 145};
                color = {r:color.r - diff.r*factor,g:color.g - diff.g*factor,b:color.b - diff.b*factor};
            }
            if(terrain[near[4]] > 0) {
                var shade = nearHeight - terrain[near[4]]*2;
                if(shade > 0) { // Draw shading
                    factor = shade/35;
                    diff = {r:color.r - 10,g:color.g - 10, b:color.b - 10};
                    color = {r:color.r - diff.r*factor,g:color.g - diff.g*factor,b:color.b - diff.b*factor};
                } else if(shade < 0) { // Draw highlighting
                    factor = shade/-50;
                    diff = {r:color.r - 247,g:color.g - 246, b:color.b - 220};
                    color = {r:color.r - diff.r*factor,g:color.g - diff.g*factor,b:color.b - diff.b*factor};
                }
            }
            
            color = {r:parseInt(color.r),g:parseInt(color.g),b:parseInt(color.b)}; // Int-ify
            return 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',1)';
        };
            
        return {
            fillCanvas: function(context,color) {
                var method = color == 'erase' ? 'clearRect' : 'fillRect';
                if(color != 'erase') { context.fillStyle = color.charAt(0) == 'r' ? color : '#' + color; }
                context[method](0,0,1200,750);
            },
            fillMainArea: function(context,color,coords,size) {
                var method = color == 'erase' ? 'clearRect' : 'fillRect';
                if(color != 'erase') { context.fillStyle = color.charAt(0) == 'r' ? color : '#' + color; }
                context[method](coords[0]*mainPixSize,coords[1]*mainPixSize,
                    size[0]*mainPixSize,size[1]*mainPixSize);
            },
            drawPixel: function(context,color,coords,size) {
                var method = color == 'erase' ? 'clearRect' : 'fillRect';
                var x = parseInt(coords[0]), y = parseInt(coords[1]);
                if(color != 'erase') { context.fillStyle = color.charAt(0) == 'r' ? color : '#' + color; }
                context[method](x*pixSize,y*pixSize,size[0]*pixSize,size[1]*pixSize);
            },
            drawTerrain: function(context,terrain,coords,zoomPosition,zoomPixSize) {
                var canvasType = context.canvas.id.substr(0,4); // Zoom or full canvas?
                var x = parseInt(coords[0]), y = parseInt(coords[1]);
                // Don't draw on zoom canvas if pixel is out of bounds
                if((canvasType == 'zoom' && x+1 < zoomPosition[0]) ||
                    (canvasType == 'zoom' && y+1 < zoomPosition[1]) ||
                    (canvasType == 'zoom' && x-1 > zoomPosition[0]+(600/zoomPixSize)) ||
                    (canvasType == 'zoom' && y-1 > zoomPosition[1]+(600/zoomPixSize))) {
                    return;
                }
                var canvasPixSize = canvasType == 'full' ? mainPixSize : zoomPixSize;
                var offset = canvasType == 'full' ? [0,0] : zoomPosition;
                var affected = listNear(coords);
                for(var i = 0; i < affected.length; i++) {
                    var thisCoord = affected[i].split(':');
                    var nearThis = listNear(thisCoord);
                    var color = surveyNear(nearThis,terrain);
                    var thisX = parseInt(thisCoord[0]), thisY = parseInt(thisCoord[1]);
                    context.fillStyle = color;
                    context.fillRect((thisX - offset[0])*canvasPixSize,(thisY - offset[1])*canvasPixSize,
                        canvasPixSize,canvasPixSize);
                }
            },
            drawSelect: function(context,coords,zoomPixSize) {
                var x = coords[0], y = coords[1];
                var thickness = zoomPixSize < 16 ? 1 : zoomPixSize < 31 ? 2 : 3;
                context.fillStyle = 'rgba(255, 255, 255, 0.7)';
                context.fillRect(x * zoomPixSize-thickness, y * zoomPixSize-thickness, // Outer box
                    zoomPixSize+thickness*2, zoomPixSize+thickness*2);
                context.clearRect(x * zoomPixSize+2*thickness, y * zoomPixSize-thickness, // Vertical
                    zoomPixSize-4*thickness, zoomPixSize+thickness*2);
                context.clearRect(x * zoomPixSize-thickness, y * zoomPixSize+2*thickness, // Horizontal
                    zoomPixSize+thickness*2, zoomPixSize-4*thickness);
                context.clearRect(x * zoomPixSize, y * zoomPixSize, // Inner box
                    zoomPixSize, zoomPixSize);
            },
            drawPing: function(context,coords) {
                var pingGradient = context.createRadialGradient(
                    coords[0]*mainPixSize + mainPixSize/2, coords[1]*mainPixSize + mainPixSize/2, 5,
                    coords[0]*mainPixSize + mainPixSize/2, coords[1]*mainPixSize + mainPixSize/2, 0
                );
                pingGradient.addColorStop(0, "rgba(255, 255, 255, 0)");
                pingGradient.addColorStop(0.2, "rgba(255, 255, 255, 1)");
                pingGradient.addColorStop(0.4, "rgba(255, 255, 255, 0)");
                pingGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
                context.fillStyle = pingGradient;
                context.beginPath();
                context.arc(coords[0]*mainPixSize + mainPixOff,
                    coords[1]*mainPixSize +mainPixOff, 5, 0, 2 * Math.PI, false);
                var cycle = 0;
                function fadePing() {
                    if(Math.round(cycle/2) == cycle/2) {
                        context.fill();
                    } else {
                        context.clearRect(coords[0] * mainPixSize - 15 + mainPixOff,
                            coords[1] * mainPixSize - 15 + mainPixOff, 30, 30);
                    }
                    cycle++;
                    if(cycle >= 8) {
                        clearInterval(pingInt);
                    }
                }
                var pingInt = setInterval(function(){fadePing()},200);
            },
            clearPing: function(context,coords) {
                context.clearRect(coords[0] * mainPixSize - 15 + mainPixOff,
                    coords[1] * mainPixSize - 15 + mainPixOff, 30, 30);
            }
        }
});