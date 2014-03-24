/* Canvas drawing service */

angular.module('Geographr.canvas', [])
.factory('canvasUtility', function(colorUtility) {
        var fullPixSize = 1;
        var fullPixOff = fullPixSize/2;
        
        // Return a list of coordinates surrounding and including the input coords
        var listNear = function(coords,dist) {
            coords[0] = parseInt(coords[0]); coords[1] = parseInt(coords[1]);
            var near = [];
            for(var i = dist*-1; i < dist+1; i++) {
                for(var ii = dist*-1; ii < dist+1; ii++) {
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
            if(terrain[near[4]] > 4) { // Draw brown mountains
                coef = (terrain[near[4]]-4)/12;
                diff = {r:color.r - 88,g:color.g - 93, b:color.b - 70};
                color = {r:color.r - diff.r*coef,g:color.g - diff.g*coef,b:color.b - diff.b*coef};
            }
            if(terrain[near[4]] > 16) { // Draw grey heights
                coef = (terrain[near[4]]-16)/10;
                diff = {r:color.r - 144,g:color.g - 144, b:color.b - 145};
                color = {r:color.r - diff.r*coef,g:color.g - diff.g*coef,b:color.b - diff.b*coef};
            }
            if(terrain[near[4]] > 26) { // Draw whiter peaks
                coef = (terrain[near[4]]-26)/30;
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
                        var nearThis = listNear(thisCoord,1);
                        var color = surveyTerrain(nearThis,terrain);
                        var x = parseInt(thisCoord[0]), y = parseInt(thisCoord[1]);
                        context.fillStyle = color;
                        var height = terrain.hasOwnProperty(ii+':'+i) ? terrain[ii+':'+i] : 0;
                        context.fillRect((x+y)*2,(600+(y-x))/3,2,(height+4)/-2);
                        //}
                    }
                }
            },
            drawTerrain: function(context,terrain,coords,zoomPosition,zoomPixSize) {
                var canvasType = context.canvas.id.substr(0,4); // Zoom or full canvas?
                var drawType = context.canvas.id.substr(4,1); // Object or terrain?
                var x = parseInt(coords[0]), y = parseInt(coords[1]);
                // Don't draw on zoom canvas if pixel is out of bounds
                if((canvasType == 'zoom' && x+1 < zoomPosition[0]) ||
                    (canvasType == 'zoom' && y+1 < zoomPosition[1]) ||
                    (canvasType == 'zoom' && x-1 > zoomPosition[0]+(900/zoomPixSize)) ||
                    (canvasType == 'zoom' && y-1 > zoomPosition[1]+(600/zoomPixSize))) {
                    return;
                }
                var canvasPixSize = canvasType == 'full' ? fullPixSize : zoomPixSize;
                var offset = canvasType == 'full' ? [0,0] : zoomPosition;
                var affected = listNear(coords,1);
                for(var i = 0; i < affected.length; i++) {
                    
                    //if(drawType=='O' && !things.hasOwnProperty(affected[i])) { continue; }
                    var thisCoord = affected[i].split(':');
                    var nearThis = listNear(thisCoord,1);
                    var color = surveyTerrain(nearThis,terrain);
                    var thisX = parseInt(thisCoord[0]), thisY = parseInt(thisCoord[1]);
                    context.fillStyle = color;
                    var drawMethod = color == 'erase' ? 'clearRect' : 'fillRect';
                    context[drawMethod]((thisX - offset[0])*canvasPixSize,
                        (thisY - offset[1])*canvasPixSize, canvasPixSize,canvasPixSize);
                }
            },
            drawObject: function(context,object,coords,zoomPosition,zoomPixSize) {
                var canvasType = context.canvas.id.substr(0,4); // Zoom or full canvas?
                var x = parseInt(coords[0]), y = parseInt(coords[1]);
                // Don't draw on zoom canvas if pixel is out of bounds
                if((canvasType == 'zoom' && x+1 < zoomPosition[0]) ||
                    (canvasType == 'zoom' && y+1 < zoomPosition[1]) ||
                    (canvasType == 'zoom' && x-1 > zoomPosition[0]+(900/zoomPixSize)) ||
                    (canvasType == 'zoom' && y-1 > zoomPosition[1]+(600/zoomPixSize))) {
                    return;
                }
                var canvasPixSize = canvasType == 'full' ? fullPixSize : zoomPixSize;
                var offset = canvasType == 'full' ? [0,0] : zoomPosition;
                for(var i = 0; i < object.length; i++) {
                    switch(object[i].type) {
                        case 'userCamp': context.fillStyle = 'rgba(73,68,39,0.8)';
                            if(canvasType == 'full') {
                                context.fillRect((x - offset[0]),(y - offset[1]),1,1); break;
                            }
                            context.strokeStyle = 'rgba(0,0,0,0)';
                            context.beginPath();
                            context.moveTo((x - offset[0])*canvasPixSize+canvasPixSize/2,
                                (y - offset[1])*canvasPixSize);
                            context.lineTo((x - offset[0])*canvasPixSize+canvasPixSize,
                                (y - offset[1])*canvasPixSize+canvasPixSize/2);
                            context.lineTo((x - offset[0])*canvasPixSize+canvasPixSize/2,
                                (y - offset[1])*canvasPixSize+canvasPixSize);
                            context.lineTo((x - offset[0])*canvasPixSize,
                                (y - offset[1])*canvasPixSize+canvasPixSize/2);
                            context.closePath();
                            context.fill();
                            break;
                        case 'camp': context.fillStyle = 'rgb(100,100,100)';
                            context.fillRect((x - offset[0])*canvasPixSize,
                                (y - offset[1])*canvasPixSize, canvasPixSize,canvasPixSize);
                            break;
                    }
                }
            },
            drawPlayer: function(context,coords,zoomPosition,zoomPixSize) {
                if(!coords) { return; }
                var canvasType = context.canvas.id.substr(0,4); // Zoom or full canvas?
                var x = parseInt(coords[0]), y = parseInt(coords[1]);
                // Don't draw on zoom canvas if pixel is out of bounds
                if((canvasType == 'zoom' && x+1 < zoomPosition[0]) ||
                    (canvasType == 'zoom' && y+1 < zoomPosition[1]) ||
                    (canvasType == 'zoom' && x-1 > zoomPosition[0]+(900/zoomPixSize)) ||
                    (canvasType == 'zoom' && y-1 > zoomPosition[1]+(600/zoomPixSize))) {
                    return;
                }
                var canvasPixSize = canvasType == 'full' ? fullPixSize : zoomPixSize;
                var offset = canvasType == 'full' ? [0,0] : zoomPosition;
                context.strokeStyle = context.fillStyle = 'rgba(255,255,255,0.8)';
                if(canvasType == 'full') {
                    context.fillRect((x - offset[0]),(y - offset[1]),1,1); return;
                }
                context.shadowColor = 'rgba(0,0,0,0.6)';
                context.shadowOffsetX = context.shadowOffsetY = 1;
                context.shadowBlur = 2;
                context.lineWidth = canvasType == 'full' ? 1 : zoomPixSize/9;
                context.beginPath();
                context.arc((x - offset[0])*canvasPixSize+canvasPixSize/2,
                    (y - offset[1])*canvasPixSize+canvasPixSize/2,
                    canvasPixSize/3, 0, Math.PI*2);
                context.closePath();
                context.stroke();
                context.shadowColor = 'rgba(0,0,0,0)';
            },
            drawAllTerrain: function(context,terrain) {
                context.fillStyle = 'rgb(44,61,75)'; // Clear canvas first
                context.fillRect(0,0,300,300);
                for(var key in terrain) {
                    if(terrain.hasOwnProperty(key)) {
                        var coord = key.split(':');
                        var affected = listNear(coord,1);
                        for(var i = 0; i < affected.length; i++) {
                            // If not drawing center pixel, only draw if it's water
                            if(i != 4 && terrain.hasOwnProperty(affected[i])) { continue; }
                            var thisCoord = affected[i].split(':');
                            var nearThis = listNear(thisCoord,1);
                            var color = surveyTerrain(nearThis,terrain);
                            var thisX = parseInt(thisCoord[0]), thisY = parseInt(thisCoord[1]);
                            context.fillStyle = color;
                            context.fillRect(thisX*fullPixSize,thisY*fullPixSize,
                                fullPixSize,fullPixSize);
                        }
                    }
                }
            },
            drawCamps: function(context,camps,zoomPosition,zoomPixSize) {
                for(var key in camps) {
                    if(camps.hasOwnProperty(key)) {
                        var x = parseInt(key.split(':')[0]), y = parseInt(key.split(':')[1]);
                        if((x+1 < zoomPosition[0]) || (y+1 < zoomPosition[1]) ||
                            (x-1 > zoomPosition[0]+(900/zoomPixSize)) ||
                            (y-1 > zoomPosition[1]+(600/zoomPixSize))) {
                            continue;
                        }
                        context.fillStyle = 'rgb(255,255,255)';
                        context.fillRect((x - zoomPosition[0])*zoomPixSize,
                            (y - zoomPosition[1])*zoomPixSize, zoomPixSize,zoomPixSize);
                    }
                }
            },
            drawFog: function(context,terrainContext,pixels,zoomPosition,zoomPixSize) {
                var canvasType = context.canvas.id.substr(0,4); // Zoom or full canvas?
                var canvasPixSize = canvasType == 'full' ? fullPixSize : zoomPixSize;
                var offset = canvasType == 'full' ? [0,0] : zoomPosition;
                context.fillStyle = 'rgb(46,51,56)';
                if(canvasType == 'full') { context.fillRect(0,0,900,600); }
                for(var key in pixels) {
                    if(!pixels.hasOwnProperty(key)) { continue; }
                    var thisCoord = key.split(':');
                    var thisX = parseInt(thisCoord[0]), thisY = parseInt(thisCoord[1]);
                    context.clearRect((thisX - offset[0])*canvasPixSize,
                        (thisY - offset[1])*canvasPixSize, canvasPixSize,canvasPixSize);
                    if(pixels[key] == 2 && canvasType == 'full') { // If explored pixel
                        var p = terrainContext.getImageData(thisX, thisY, 1, 1).data;
                        var grey = parseInt(p[0]*0.2989 + p[1]*0.587 + p[2]*0.114)-15;
                        var greyed = {r:grey+(p[0]-grey)*0.3,g:grey+(p[1]-grey)*0.3, b:grey+(p[2]-grey)*0.3};
                        var fogDiff = {r:(46-greyed.r)*0.2,g:(51-greyed.g)*0.2, b:(56-greyed.b)*0.2};
                        context.fillStyle = 'rgb('+parseInt(greyed.r+fogDiff.r)+','
                            +parseInt(greyed.g+fogDiff.g)+','+parseInt(greyed.b+fogDiff.b)+')';
                        context.fillRect((thisX - offset[0])*canvasPixSize,
                            (thisY - offset[1])*canvasPixSize, canvasPixSize,canvasPixSize);
                    }
                }
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
            drawPath: function(context,start,path,zoomPosition,zoomPixSize,moving) {
                var startCoords = [parseInt(start.split(':')[0]),parseInt(start.split(':')[1])];
                var lastCoord, thisCoord;
                context.strokeStyle = context.fillStyle = moving ? 'rgb(0,255,50)' : 'rgb(255,255,255)';
                context.lineWidth = zoomPixSize % 2 ? 0.5 : 1;
                context.beginPath();
                context.moveTo((startCoords[0]-zoomPosition[0])*zoomPixSize+zoomPixSize/2,
                    (startCoords[1]-zoomPosition[1])*zoomPixSize+zoomPixSize/2);
                for(var i = 0; i < path.length; i++) {
                    lastCoord = thisCoord ? thisCoord : startCoords;
                    thisCoord = [parseInt(path[i].split(':')[0]),parseInt(path[i].split(':')[1])];
                    context.lineTo((thisCoord[0]-zoomPosition[0])*zoomPixSize+zoomPixSize/2,
                        (thisCoord[1]-zoomPosition[1])*zoomPixSize+zoomPixSize/2);
                }
                context.stroke();
                context.beginPath(); // Arrowhead
                if(thisCoord[0] != lastCoord[0]) { // Left/Right arrow
                    var offX = thisCoord[0] < lastCoord[0] ? zoomPixSize/3 : 0;
                    context.moveTo((thisCoord[0]-zoomPosition[0])*zoomPixSize+zoomPixSize/3+offX,
                        (thisCoord[1]-zoomPosition[1])*zoomPixSize+zoomPixSize/2-zoomPixSize/4);
                    context.lineTo((thisCoord[0]-zoomPosition[0])*zoomPixSize+zoomPixSize/3+offX,
                        (thisCoord[1]-zoomPosition[1])*zoomPixSize+zoomPixSize/2+zoomPixSize/4);
                } else { // Up/Down arrow
                    var offY = thisCoord[1] < lastCoord[1] ? zoomPixSize/3 : 0;
                    context.moveTo((thisCoord[0]-zoomPosition[0])*zoomPixSize+zoomPixSize/2-zoomPixSize/4,
                        (thisCoord[1]-zoomPosition[1])*zoomPixSize+zoomPixSize/3+offY);
                    context.lineTo((thisCoord[0]-zoomPosition[0])*zoomPixSize+zoomPixSize/2+zoomPixSize/4,
                        (thisCoord[1]-zoomPosition[1])*zoomPixSize+zoomPixSize/3+offY);
                }
                context.lineTo((thisCoord[0]-zoomPosition[0])*zoomPixSize+zoomPixSize/2,
                    (thisCoord[1]-zoomPosition[1])*zoomPixSize+zoomPixSize/2);
                context.closePath();
                context.fill();
            },
            drawLabel: function(context,coords,text,zoomPixSize) {
                var x = parseInt(coords[0]), y = parseInt(coords[1]);
                context.font = "14px Georgia";
                context.textAlign = 'center';
                context.textBaseline = 'bottom';
                context.fillStyle = 'rgba(0,0,0,0.8)';
                context.shadowColor = 'black';
                context.shadowOffsetX = context.shadowOffsetY = 0;
                context.shadowBlur = 1;
                context.fillText(text, x*zoomPixSize+2+zoomPixSize/2, y*zoomPixSize+1);
                context.fillStyle = 'white';
                context.fillText(text, x*zoomPixSize+zoomPixSize/2, y*zoomPixSize);
                context.shadowColor = 'rgba(0,0,0,0)';
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