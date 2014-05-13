/* Canvas drawing service */

angular.module('Geographr.canvas', [])
.service('canvasUtility', function(colorUtility) {
        var fullPixSize = 1;
        var fullPixOff = fullPixSize/2;
        
        var mid = [{r:60,g:93,b:44},{r:70,g:107,b:53},{r:82,g:125,b:62},{r:106,g:140,b:70},
            {r:136,g:158,b:86},{r:174,g:172,b:102},{r:98,g:140,b:118},{r:71,g:121,b:110},
            {r:62,g:102,b:99},{r:51,g:79,b:87},{r:46,g:69,b:79},{r:44,g:61,b:75}];
        var north = [{r:212,g:213,b:213},{r:192,g:192,b:190},{r:170,g:170,b:166},{r:150,g:147,b:142},
            {r:128,g:125,b:117},{r:105,g:101,b:91},{r:88,g:100,b:105},{r:84,g:94,b:100},
            {r:78,g:89,b:94},{r:73,g:84,b:88},{r:68,g:77,b:83},{r:62,g:71,b:77}];
        var south = [{r:89,g:103,b:49},{r:108,g:119,b:70},{r:123,g:132,b:87},{r:140,g:145,b:108},
            {r:158,g:161,b:127},{r:176,g:175,b:147},{r:113,g:158,b:134},{r:101,g:143,b:122},
            {r:86,g:125,b:108},{r:72,g:107,b:94},{r:57,g:90,b:80},{r:42,g:71,b:65}];
        
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
            var clump = near[4].split(':')[0] % 4 < 2 ? 
                Math.ceil(near[4].split(':')[0]/2)+':'+Math.floor(near[4].split(':')[1]/2) :
                Math.floor(near[4].split(':')[0]/2)+':'+Math.ceil(near[4].split(':')[1]/2);
            Math.seedrandom('chunk-'+clump);
            var nearRandom = Math.random() * 0.5 + 0.8;
            Math.seedrandom('grid-'+near[4]);
            var random = Math.random() * 0.2 + 1;
            var northCoef = Math.min(1,nearRandom*random*Math.max(0,120-near[4].split(':')[1])/80);
            var southCoef = Math.min(1,nearRandom*random*Math.max(0,near[4].split(':')[1]-200)/100);
            var latDiff = [];
            if(northCoef > 0) { // If north of y:120
                for(var n = 0; n < mid.length; n++) {
                    latDiff.push({r:(north[n].r-mid[n].r)*northCoef,
                        g:(north[n].g-mid[n].g)*northCoef,
                        b:(north[n].b-mid[n].b)*northCoef});
                }
            } else if(southCoef > 0) { // If south of y:200
                for(var m = 0; m < mid.length; m++) {
                    latDiff.push({r:(south[m].r-mid[m].r)*southCoef,
                        g:(south[m].g-mid[m].g)*southCoef,
                        b:(south[m].b-mid[m].b)*southCoef});
                }
            } else { // If in the middle
                for(var o = 0; o < mid.length; o++) {
                    latDiff.push({r:0,g:0,b:0});
                }
            }
            var getLatColor = function(i) {
                return {r:mid[i].r+latDiff[i].r,g:mid[i].g+latDiff[i].g,b:mid[i].b+latDiff[i].b};
            };
            if(type > 0) {
                if(landNear >= 95) { color = getLatColor(0); }
                else if(landNear >= 90) { color = getLatColor(1); }
                else if(landNear >= 80) { color = getLatColor(2); }
                else if(landNear >= 70) { color = getLatColor(3); }
                else if(landNear >= 60) { color = getLatColor(4); }
                else { color = getLatColor(5); }
            } else {
                if(landNear >= 90) { color = getLatColor(6); }
                else if(landNear >= 65) { color = getLatColor(7); }
                else if(landNear >= 40) { color = getLatColor(8); }
                else if(landNear >= 15) { color = getLatColor(9); }
                else if(landNear >= 10) { color = getLatColor(10); }
                else { color = getLatColor(11); }
            }
            var midHills = { r:88, g:93, b:70 };
            var midMountains = { r:145, g:144, b:144 };
            var northHills = { r:132, g:131, b:122 };
            var northMountains = { r:69, g:68, b:64 };
            var southHills = { r:103, g:99, b:68 };
            var southMountains = { r:146, g:144, b:130 };
            var hillDiff = northCoef > 0 ? {r:(northHills.r-midHills.r)*northCoef,
                g:(northHills.g-midHills.g)*northCoef,b:(northHills.b-midHills.b)*northCoef} : southCoef > 0 ?
                {r:(southHills.r-midHills.r)*southCoef,g:(southHills.g-midHills.g)*southCoef,
                b:(southHills.b-midHills.b)*southCoef} : {r:0,g:0,b:0};
            var mountainDiff = northCoef > 0 ? {r:(northMountains.r-midMountains.r)*northCoef,
                g:(northMountains.g-midMountains.g)*northCoef,
                b:(northMountains.b-midMountains.b)*northCoef} : southCoef > 0 ?
                {r:(southMountains.r-midMountains.r)*southCoef,
                g:(southMountains.g-midMountains.g)*southCoef,
                b:(southMountains.b-midMountains.b)*southCoef} : {r:0,g:0,b:0};
            var coef = 0, diff = {};
            var hillRange = [4,12-northCoef*3];
            var mountainRange = [16-northCoef*7,12+northCoef*6];
            if(terrain[near[4]] > hillRange[0]) { // Draw brown heights
                coef = Math.min(hillRange[1],(terrain[near[4]]-hillRange[0]))/hillRange[1];
                diff = {r:color.r - (midHills.r+hillDiff.r),g:color.g - (midHills.g+hillDiff.g), 
                    b:color.b - (midHills.b+hillDiff.b)};
                color = {r:color.r - diff.r*coef,g:color.g - diff.g*coef,b:color.b - diff.b*coef};
            }
            if(terrain[near[4]] > mountainRange[0]) { // Draw grey mountains
                coef = Math.min(mountainRange[1],(terrain[near[4]]-mountainRange[0]))/mountainRange[1];
                diff = {r:color.r - (midMountains.r+mountainDiff.r),
                    g:color.g - (midMountains.g+mountainDiff.g),
                    b:color.b - (midMountains.b+mountainDiff.b)};
                color = {r:color.r - diff.r*coef,g:color.g - diff.g*coef,b:color.b - diff.b*coef};
            }
            if(terrain[near[4]] > 26) { // Draw whiter peaks
                coef = Math.min(30,(terrain[near[4]]-26))/30;
                diff = {r:color.r - 255,g:color.g - 255, b:color.b - 255};
                color = {r:color.r - diff.r*coef,g:color.g - diff.g*coef,b:color.b - diff.b*coef};
            }
            if(terrain[near[4]] > 0) {
                if(nearHeight > 0) { // Draw shading
                    coef = Math.min(30,nearHeight)/50;
                    diff = {r:color.r - 10,g:color.g - 10, b:color.b - 10};
                    color = {r:color.r - diff.r*coef,g:color.g - diff.g*coef,b:color.b - diff.b*coef};
                } else if(nearHeight < 0) { // Draw highlighting
                    coef = Math.max(-30,nearHeight)/-50;
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
                context.shadowColor = 'rgba(0,0,0,0.6)';
                context.shadowOffsetX = context.shadowOffsetY = zoomPixSize/16;
                context.shadowBlur = zoomPixSize/12;
                for(var i = 0; i < object.length; i++) {
                    switch(object[i].type) {
                        case 'userCamp': 
                            context.strokeStyle = 'rgba(73,68,39,1)'; context.fillStyle = '#'+object[i].color;
                            if(canvasType == 'full') {
                                context.shadowColor = 'rgba(0,0,0,0)';
                                context.fillRect((x - offset[0]),(y - offset[1]),1,1); break;
                            }
                            context.fillStyle = '#' + object[i].color;
                            context.lineWidth = zoomPixSize / 6;
                            x = (x - offset[0])*zoomPixSize; y = (y - offset[1])*zoomPixSize;
                            context.beginPath();
                            context.moveTo(x+zoomPixSize/2, y+context.lineWidth/1.3);
                            context.lineTo(x+zoomPixSize-context.lineWidth/1.3, y+zoomPixSize/2);
                            context.lineTo(x+zoomPixSize/2, y+zoomPixSize-context.lineWidth/1.3);
                            context.lineTo(x+context.lineWidth/1.3, y+zoomPixSize/2);
                            context.closePath(); context.fill(); context.stroke();
                            break;
                        case 'camp': context.fillStyle = 'rgb(140,140,140)';
                            if(canvasType == 'full') { 
                                context.fillRect((x - offset[0]),(y - offset[1]), 1,1); break; }
                            var pix = zoomPixSize % 4 ? 1 : 0; // Keep sharp pixels
                            x = (x - offset[0])*zoomPixSize; y = (y - offset[1])*zoomPixSize;
                            context.fillRect(Math.floor(x+zoomPixSize/4), Math.floor(y+zoomPixSize/4), 
                                canvasPixSize-zoomPixSize/2+pix,canvasPixSize-zoomPixSize/2+pix);
                            break;
                        case 'campfire': context.fillStyle = 'rgba(166,95,44,0.8)';
                            if(canvasType == 'full') { break; }
                            x = (x - offset[0])*zoomPixSize; y = (y - offset[1])*zoomPixSize;
                            context.beginPath();
                            context.moveTo(x+zoomPixSize/2, y+zoomPixSize/3);
                            context.lineTo(x+zoomPixSize*2/3, y+zoomPixSize/2);
                            context.lineTo(x+zoomPixSize/2, y+zoomPixSize*2/3);
                            context.lineTo(x+zoomPixSize/3, y+zoomPixSize/2);
                            context.closePath(); context.fill();
                            break;
                    }
                }
                context.shadowColor = 'rgba(0,0,0,0)';
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
                context.shadowOffsetX = context.shadowOffsetY = 1; context.shadowBlur = 2;
                context.lineWidth = canvasType == 'full' ? 1 : zoomPixSize/9;
                context.beginPath();
                context.arc((x - offset[0])*canvasPixSize+canvasPixSize/2,
                    (y - offset[1])*canvasPixSize+canvasPixSize/2,
                    canvasPixSize/3, 0, Math.PI*2);
                context.closePath(); context.stroke();
                context.shadowColor = 'rgba(0,0,0,0)';
            },
            drawAllTerrain: function(context,terrain,visible) {
                var waterGradient = context.createLinearGradient(0,0,0,299);
                waterGradient.addColorStop(0,'rgb(62,71,77)');
                waterGradient.addColorStop(0.13,'rgb(62,71,77)');
                waterGradient.addColorStop(0.4,'rgb(44,61,75)');
                waterGradient.addColorStop(0.67,'rgb(42,71,65)');
                waterGradient.addColorStop(1,'rgb(42,71,65)');
                context.fillStyle = waterGradient;
                context.fillRect(0,0,300,300);
                for(var key in terrain) {
                    if(terrain.hasOwnProperty(key)) {
                        var coord = key.split(':');
                        var affected = listNear(coord,1);
                        var drawIt = false;
                        for(var n = 0; n < affected.length; n++) {
                            if(!visible || visible.hasOwnProperty(affected[n])) { drawIt = true; break;  }
                        }
                        if(!drawIt && visible) { continue; }
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
            drawFog: function(context,terrainContext,pixels,zoomPosition,zoomPixSize,terrain) {
                var canvasType = context.canvas.id.substr(0,4); // Zoom or full canvas?
                var canvasPixSize = canvasType == 'full' ? fullPixSize : zoomPixSize;
                var offset = canvasType == 'full' ? [0,0] : zoomPosition;
                context.fillStyle = 'rgb(42,47,51)';
                if(canvasType == 'full') { context.fillRect(0,0,900,600); }
                for(var key in pixels) {
                    if(!pixels.hasOwnProperty(key)) { continue; }
                    var thisCoord = key.split(':');
                    var thisX = parseInt(thisCoord[0]), thisY = parseInt(thisCoord[1]);
                    context.clearRect((thisX - offset[0])*canvasPixSize,
                        (thisY - offset[1])*canvasPixSize, canvasPixSize,canvasPixSize);
                    if(pixels[key] > 1 && canvasType == 'full') { // If semi-visible/explored pixel
                        var p = terrainContext.getImageData(thisX, thisY, 1, 1).data;
                        var isWater = !terrain.hasOwnProperty(key);
                        var grey = parseInt(p[0]*0.2989 + p[1]*0.587 + p[2]*0.114)-15;
                        var greyAmount = pixels[key] == 1.5 ? 0.8 : pixels[key] == 2 ? 0.4 : 0.25;
                        var greyed = {r:grey+(p[0]-grey)*greyAmount,g:grey+(p[1]-grey)*greyAmount,
                            b:grey+(p[2]-grey)*greyAmount};
                        greyed.b += isWater ? 10 : 0; greyed.g += isWater ? 6 : 0;
                        var fogAmount = pixels[key] == 1.5 ? 0.3 : pixels[key] == 2 ? 0.45 : 0.65;
                        var fogDiff = 
                            {r:(42-greyed.r)*fogAmount,g:(47-greyed.g)*fogAmount, b:(51-greyed.b)*fogAmount};
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
                context.shadowColor = 'rgba(0,0,0,0.6)';
                context.shadowOffsetX = context.shadowOffsetY = zoomPixSize/16;
                context.shadowBlur = zoomPixSize/12;
                context.strokeStyle = context.fillStyle = moving ? 'rgb(0,220,45)':'rgb(200,200,200)';
                context.lineWidth = zoomPixSize < 13 ? 1 : 2;
                var pix = context.lineWidth == 2 ? zoomPixSize % 2 ? 1 : 0 : 0.5; // Keep sharp pixels
                var lastNode = path[path.length-1].split(':');
                var secondLastNode = path.length > 1 ? path[path.length-2].split(':') : startCoords;
                var drawLine = function() {
                    context.beginPath();
                    context.moveTo((startCoords[0]-zoomPosition[0])*zoomPixSize+zoomPixSize/2+pix,
                        (startCoords[1]-zoomPosition[1])*zoomPixSize+zoomPixSize/2+pix);
                    for(var i = 0; i < path.length; i++) {
                        lastCoord = thisCoord ? thisCoord : startCoords;
                        thisCoord = [parseInt(path[i].split(':')[0]),parseInt(path[i].split(':')[1])];
                        context.lineTo((thisCoord[0]-zoomPosition[0])*zoomPixSize+zoomPixSize/2+pix,
                            (thisCoord[1]-zoomPosition[1])*zoomPixSize+zoomPixSize/2+pix);
                    }
                    context.stroke();
                };
                var drawArrowhead = function(shadow) {
                    context.shadowColor = shadow ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0)';
                    context.beginPath(); // Arrowhead
                    if(lastNode[0] != secondLastNode[0]) { // Left/Right arrow
                        var offX = parseInt(lastNode[0]) < secondLastNode[0] ? zoomPixSize/3 : 0;
                        context.moveTo((lastNode[0]-zoomPosition[0])*zoomPixSize+zoomPixSize/3+offX,
                            (lastNode[1]-zoomPosition[1])*zoomPixSize+zoomPixSize/2-zoomPixSize/4);
                        context.lineTo((lastNode[0]-zoomPosition[0])*zoomPixSize+zoomPixSize/3+offX,
                            (lastNode[1]-zoomPosition[1])*zoomPixSize+zoomPixSize/2+zoomPixSize/4);
                    } else { // Up/Down arrow
                        var offY = parseInt(lastNode[1]) < secondLastNode[1] ? zoomPixSize/3 : 0;
                        context.moveTo((lastNode[0]-zoomPosition[0])*zoomPixSize+zoomPixSize/2-zoomPixSize/4,
                            (lastNode[1]-zoomPosition[1])*zoomPixSize+zoomPixSize/3+offY);
                        context.lineTo((lastNode[0]-zoomPosition[0])*zoomPixSize+zoomPixSize/2+zoomPixSize/4,
                            (lastNode[1]-zoomPosition[1])*zoomPixSize+zoomPixSize/3+offY);
                    }
                    context.lineTo((lastNode[0]-zoomPosition[0])*zoomPixSize+zoomPixSize/2,
                        (lastNode[1]-zoomPosition[1])*zoomPixSize+zoomPixSize/2);
                    context.closePath(); context.fill();
                };
                if(parseInt(lastNode[0]) > secondLastNode[0] || parseInt(lastNode[1]) > secondLastNode[1]) {
                    drawLine(); drawArrowhead(true); 
                } else { drawArrowhead(true); drawLine(); drawArrowhead(false); }
                context.shadowColor = 'rgba(0,0,0,0)';
            },
            drawLabel: function(context,coords,text,zoomPixSize) {
                var x = parseInt(coords[0]), y = parseInt(coords[1]);
                var fontSize = 10 + zoomPixSize / 4;
                context.font = fontSize + 'px Georgia'; context.textAlign = 'center';
                context.textBaseline = 'bottom'; context.fillStyle = 'rgba(0,0,0,0.8)';
                var xOffset = 0, yOffset = 0;
                if(x*zoomPixSize+zoomPixSize/2-context.measureText(text).width/2 < 0) {
                    xOffset = Math.abs(x*zoomPixSize+zoomPixSize/2-context.measureText(text).width/2) + 1;
                } else if(x*zoomPixSize+zoomPixSize/2+context.measureText(text).width/2 > 899) {
                    xOffset = 899 - (x*zoomPixSize+zoomPixSize/2+context.measureText(text).width/2) - 2;
                }
                if(y == 0) { yOffset = zoomPixSize * 2; }
                context.shadowColor = 'black'; context.shadowOffsetX = context.shadowOffsetY = 0;
                context.shadowBlur = 1;
                context.fillText(text, x*zoomPixSize+2+zoomPixSize/2+xOffset, 
                    y*zoomPixSize+1-4-zoomPixSize/20 + yOffset);
                context.fillStyle = 'white';
                context.fillText(text, x*zoomPixSize+zoomPixSize/2+xOffset, 
                    y*zoomPixSize-4-zoomPixSize/20 + yOffset);
                context.shadowColor = 'rgba(0,0,0,0)';
            },
            drawDot: function(context,coords,size,color,alpha,zoomPixSize) {
                var x = parseInt(coords[0]), y = parseInt(coords[1]);
                if(x > 900 || x < 0 || y > 600 || y < 0) { return; }
                var rgb = colorUtility.hexToRGB(color);
                context.fillStyle = 'rgba('+rgb.r+','+rgb.g+','+rgb.b+','+alpha+')';
                context.fillRect(x*zoomPixSize+zoomPixSize/2-size*zoomPixSize/2,
                    y*zoomPixSize+zoomPixSize/2-size*zoomPixSize/2,zoomPixSize*size,zoomPixSize*size);
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
                context.fillStyle = pingGradient; context.beginPath();
                context.arc(coords[0]*fullPixSize + fullPixOff,
                    coords[1]*fullPixSize +fullPixOff, 5, 0, 2 * Math.PI, false);
                var cycle = 0;
                function fadePing() {
                    if(Math.round(cycle/2) == cycle/2) { context.fill(); } else {
                        context.clearRect(coords[0] * fullPixSize - 15 + fullPixOff,
                            coords[1] * fullPixSize - 15 + fullPixOff, 30, 30);
                    }
                    cycle++; if(cycle >= 8) { clearInterval(pingInt); }
                }
                var pingInt = setInterval(function(){fadePing()},200);
            },
            clearPing: function(context,coords) {
                context.clearRect(coords[0] * fullPixSize - 15 + fullPixOff,
                    coords[1] * fullPixSize - 15 + fullPixOff, 30, 30);
            }
        }
});