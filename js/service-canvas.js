/* Canvas drawing service */

angular.module('Geographr.canvas', [])
.factory('canvasUtility', function(colorUtility) {
        var fullPixSize = 2;
        var fullPixOff = fullPixSize/2;
        
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
        var surveyTerrain = function(near,terrain) {
            var color = '';
            var type = terrain[near[4]] > 0 ? terrain[near[4]] : 0;
            var landNear = 0;
            var nearHeight = 0;
            for(var i = 0; i < near.length; i++) {
                var x = near[i].split(':')[0], y = near[i].split(':')[1];
                    if(terrain[near[i]] > 0) {
                        if(i == 0 || i == 2 || i == 6 || i == 8) { // NW NE SE SW
                            landNear += 10;
                        } else if(i == 1 || i == 3 || i == 5 || i == 7) { // N E S W
                            landNear += 15;
                            if(i == 1 || i == 3) {
                                nearHeight += terrain[near[i]] - terrain[near[4]];
                            } else if(i == 5 || i == 7) {
                                nearHeight -= terrain[near[i]] - terrain[near[4]];
                            }
                        }
                    } else if(x < 0 || x > 299 || y < 0 || y > 299) {
                        landNear +=10; // If land on border, pretend there's land out of bounds
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
            var coef = 0, diff = {};
            if(terrain[near[4]] > 1) { // Draw brown mountains
                coef = (terrain[near[4]]-1)/8;
                diff = {r:color.r - 88,g:color.g - 93, b:color.b - 70};
                color = {r:color.r - diff.r*coef,g:color.g - diff.g*coef,b:color.b - diff.b*coef};
            }
            if(terrain[near[4]] > 8) { // Draw grey heights
                coef = (terrain[near[4]]-8)/10;
                diff = {r:color.r - 144,g:color.g - 144, b:color.b - 145};
                color = {r:color.r - diff.r*coef,g:color.g - diff.g*coef,b:color.b - diff.b*coef};
            }
            if(terrain[near[4]] > 18) { // Draw whiter peaks
                coef = (terrain[near[4]]-18)/30;
                diff = {r:color.r - 255,g:color.g - 255, b:color.b - 255};
                color = {r:color.r - diff.r*coef,g:color.g - diff.g*coef,b:color.b - diff.b*coef};
            }
            if(terrain[near[4]] > 0) {
                if(nearHeight > 0) { // Draw shading
                    coef = nearHeight/50;
                    diff = {r:color.r - 10,g:color.g - 10, b:color.b - 10};
                    color = {r:color.r - diff.r*coef,g:color.g - diff.g*coef,b:color.b - diff.b*coef};
                } else if(nearHeight < 0) { // Draw highlighting
                    coef = nearHeight/-50;
                    diff = {r:color.r - 247,g:color.g - 246, b:color.b - 220};
                    color = {r:color.r - diff.r*coef,g:color.g - diff.g*coef,b:color.b - diff.b*coef};
                }
            }
            
            color = {r:parseInt(color.r),g:parseInt(color.g),b:parseInt(color.b)}; // Int-ify
            if(color.g <0 || color.r <0 || color.b <0) console.log(color);
            return 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',1)';
        };
        var surveyObjects = function(near,objects) {
            if(!objects.hasOwnProperty(near[4])) { return 'erase'; }
            var color = '';
            var type = objects[near[4]] ? objects[near[4]].type : null;
            for(var i = 0; i < near.length; i++) {
                if(objects.hasOwnProperty(near[i])) {
                    if(objects[near[i]] > 0) {
                        if(i == 0 || i == 2 || i == 6 || i == 8) {
                            
                        } else if(i == 1 || i == 3 || i == 5 || i == 7) {
                            
                            if(i == 1 || i == 3) {
                                
                            } else if(i == 5 || i == 7) {
                                
                            }
                        }
                    }
                }
            }
            return objects[near[4]].color.hex;
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
                context[method](coords[0]*fullPixSize,coords[1]*fullPixSize,
                    size[0]*fullPixSize,size[1]*fullPixSize);
            },
            drawPixel: function(context,color,coords,size) {
                var method = color == 'erase' ? 'clearRect' : 'fillRect';
                var x = parseInt(coords[0]), y = parseInt(coords[1]);
                if(color != 'erase') { context.fillStyle = color.charAt(0) == 'r' ? color : '#' + color; }
                context[method](x*pixSize,y*pixSize,size[0]*pixSize,size[1]*pixSize);
            },
            drawIso: function(context,terrain) {
                for(var i = 0; i < 300; i++) {
                    for(var ii = 299; ii >= 0; ii--) {
                        //if(terrain.hasOwnProperty(ii+':'+i)) {
                        var thisCoord = [ii,i];
                        var nearThis = listNear(thisCoord);
                        var color = surveyTerrain(nearThis,terrain);
                        var x = parseInt(thisCoord[0]), y = parseInt(thisCoord[1]);
                        context.fillStyle = color;
                        var height = terrain.hasOwnProperty(ii+':'+i) ? terrain[ii+':'+i] : 0;
                        context.fillRect((x+y)*2,(600+(y-x))/3,2,(height+4)/-2);
                        //}
                    }
                }
            },
            drawThing: function(context,things,coords,zoomPosition,zoomPixSize) {
                var canvasType = context.canvas.id.substr(0,4); // Zoom or full canvas?
                var drawType = context.canvas.id.substr(4,1); // Object or terrain?
                var x = parseInt(coords[0]), y = parseInt(coords[1]);
                // Don't draw on zoom canvas if pixel is out of bounds
                if((canvasType == 'zoom' && x+1 < zoomPosition[0]) ||
                    (canvasType == 'zoom' && y+1 < zoomPosition[1]) ||
                    (canvasType == 'zoom' && x-1 > zoomPosition[0]+(600/zoomPixSize)) ||
                    (canvasType == 'zoom' && y-1 > zoomPosition[1]+(600/zoomPixSize))) {
                    return;
                }
                var canvasPixSize = canvasType == 'full' ? fullPixSize : zoomPixSize;
                var offset = canvasType == 'full' ? [0,0] : zoomPosition;
                var affected = listNear(coords);
                for(var i = 0; i < affected.length; i++) {
                    
                    //if(drawType=='O' && !things.hasOwnProperty(affected[i])) { continue; }
                    var thisCoord = affected[i].split(':');
                    var nearThis = listNear(thisCoord);
                    var color = drawType == 'O' ? surveyObjects(nearThis,things) : 
                        surveyTerrain(nearThis,things);
                    var thisX = parseInt(thisCoord[0]), thisY = parseInt(thisCoord[1]);
                    context.fillStyle = color;
                    var drawMethod = color == 'erase' ? 'clearRect' : 'fillRect';
                    context[drawMethod]((thisX - offset[0])*canvasPixSize,
                        (thisY - offset[1])*canvasPixSize, canvasPixSize,canvasPixSize);
                }
            },
            drawAllTerrain: function(context,terrain) { for(var key in terrain) {
                if(terrain.hasOwnProperty(key)) {
                    var coord = key.split(':');
                    var affected = listNear(coord);
                    for(var i = 0; i < affected.length; i++) {
                        // If not drawing center pixel, only draw if it's water
                        if(i != 4 && terrain.hasOwnProperty(affected[i])) { continue; }
                        var thisCoord = affected[i].split(':');
                        var nearThis = listNear(thisCoord);
                        var color = surveyTerrain(nearThis,terrain);
                        var thisX = parseInt(thisCoord[0]), thisY = parseInt(thisCoord[1]);
                        context.fillStyle = color;
                        context.fillRect(thisX*fullPixSize,thisY*fullPixSize,
                            fullPixSize,fullPixSize);
                    }
                }}
            },
            drawSelect: function(context,coords,zoomPixSize,type) {
                var x = coords[0], y = coords[1];
                var thickness = zoomPixSize < 16 ? 1 : zoomPixSize < 31 ? 2 : 3;
                context.fillStyle = 'rgba(255, 255, 255, 0.7)';
                if(type.substr(0,7) == 'terrain') {
                    var brushSize = parseInt(type.substr(7,1));
                    context.fillStyle = 'rgba(255, 255, 255, 0.5)';
                    context.fillRect(x * zoomPixSize-thickness - brushSize*zoomPixSize, 
                        y * zoomPixSize-thickness - brushSize*zoomPixSize,
                        zoomPixSize+thickness*2 + brushSize*2*zoomPixSize, 
                        zoomPixSize+thickness*2 + brushSize*2*zoomPixSize);
                } else {
                    context.fillRect(x * zoomPixSize-thickness, y * zoomPixSize-thickness, // Outer box
                        zoomPixSize+thickness*2, zoomPixSize+thickness*2);
                }
                if(type == 'object') {
                    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    for(var i = 0; i < zoomPixSize; i++) {
                        if(i/2 == parseInt(i/2)) { // If even number
                            context.fillRect(x * zoomPixSize+i, y * zoomPixSize-thickness,
                                1, zoomPixSize+thickness*2);
                            context.fillRect(x * zoomPixSize-thickness, y * zoomPixSize+i,
                                zoomPixSize+thickness*2, 1);
                        }
                    }
                }
                if(type.substr(0,7) == 'terrain') {
                    context.clearRect(x * zoomPixSize - brushSize*zoomPixSize, 
                        y * zoomPixSize - brushSize*zoomPixSize,
                        zoomPixSize + brushSize*2*zoomPixSize, zoomPixSize + brushSize*2*zoomPixSize);
                } else {
                    context.clearRect(x * zoomPixSize, y * zoomPixSize, // Inner box
                        zoomPixSize, zoomPixSize);
                }
                if(type == 'cursor') {
                    context.clearRect(x * zoomPixSize+2*thickness, y * zoomPixSize-thickness, 
                        zoomPixSize-4*thickness, zoomPixSize+thickness*2); // Vertical
                    context.clearRect(x * zoomPixSize-thickness, y * zoomPixSize+2*thickness, 
                        zoomPixSize+thickness*2, zoomPixSize-4*thickness); // Horizontal
                }
            },
            drawLabel: function(context,coords,text,zoomPixSize) {
                var x = parseInt(coords[0]), y = parseInt(coords[1]);
                context.font = "14px Georgia";
                context.textAlign = 'center';
                context.textBaseline = 'bottom';
                context.fillStyle = 'rgba(0,0,0,0.8)';
                context.shadowColor = 'black';
                context.shadowOffsetX = 0;
                context.shadowOffsetY = 0;
                context.shadowBlur = 1;
                context.fillText(text, x*zoomPixSize+2+zoomPixSize/2, y*zoomPixSize+1);
                context.fillStyle = 'white';
                context.fillText(text, x*zoomPixSize+zoomPixSize/2, y*zoomPixSize);
            },
            drawPing: function(context,coords) {
                var pingGradient = context.createRadialGradient(
                    coords[0]*fullPixSize + fullPixSize/2, coords[1]*fullPixSize + fullPixSize/2, 5,
                    coords[0]*fullPixSize + fullPixSize/2, coords[1]*fullPixSize + fullPixSize/2, 0
                );
                pingGradient.addColorStop(0, "rgba(255, 255, 255, 0)");
                pingGradient.addColorStop(0.2, "rgba(255, 255, 255, 1)");
                pingGradient.addColorStop(0.4, "rgba(255, 255, 255, 0)");
                pingGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
                context.fillStyle = pingGradient;
                context.beginPath();
                context.arc(coords[0]*fullPixSize + fullPixOff,
                    coords[1]*fullPixSize +fullPixOff, 5, 0, 2 * Math.PI, false);
                var cycle = 0;
                function fadePing() {
                    if(Math.round(cycle/2) == cycle/2) {
                        context.fill();
                    } else {
                        context.clearRect(coords[0] * fullPixSize - 15 + fullPixOff,
                            coords[1] * fullPixSize - 15 + fullPixOff, 30, 30);
                    }
                    cycle++;
                    if(cycle >= 8) {
                        clearInterval(pingInt);
                    }
                }
                var pingInt = setInterval(function(){fadePing()},200);
            },
            clearPing: function(context,coords) {
                context.clearRect(coords[0] * fullPixSize - 15 + fullPixOff,
                    coords[1] * fullPixSize - 15 + fullPixOff, 30, 30);
            }
        }
});