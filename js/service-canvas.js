/* Canvas drawing service */

angular.module('Geographr.canvas', [])
.factory('canvasUtility', function(colorUtility) {
    var pixSize = 5;
    var pixOff = pixSize/2;
    return {
        
        // TODO: Draw light scratches on the whole canvas when the app loads
        
        // TODO: Draw shards on low canvas (drawShard function)
        
        fillCanvas: function(context,color) {
            var method = color == 'erase' ? 'clearRect' : 'fillRect';
            if(color != 'erase') { context.fillStyle = color.charAt(0) == 'r' ? color : '#' + color; }
            context[method](0,0,1200,750);
        },
        drawNode: function(context,lowContext,x,y,nodes) {
            var ox = x*pixSize+pixOff, oy = y*pixSize+pixOff;
            var nearNodes = nodes[x+':'+y].hasOwnProperty('connected') ? nodes[x+':'+y].connected : [];
            for(var i = 0; i < nearNodes.length; i++) {
                if(!nodes[nearNodes[i]]) { continue; } // Skip this stroke if a connected node isn't found
                var nx = nearNodes[i].split(':')[0]*pixSize + pixOff, 
                    ny = nearNodes[i].split(':')[1]*pixSize + pixOff;
                var flip = false;
                context.lineCap = 'round'; lowContext.lineCap = 'round';
                // Always draw lines from left-to-right, top-to-bottom
                var x1 = ox, x2 = nx, y1 = oy, y2 = ny;
                if((nx < ox) || (nx == ox && ny < oy)) { flip = true; x1 = nx; x2 = ox; y1 = ny; y2 = oy; }
                var dx = x2 - x1, dy = y2 - y1; // Get deltas
                var coord1 = flip ? nearNodes[i] : x+':'+y, coord2 = flip ? x+':'+y : nearNodes[i];
                var node1 = nodes[coord1], node2 = nodes[coord2];
                var opacity1 = node1.depth/10, opacity2 = node2.depth/10;
                var r1 = 38 + Math.floor(104*opacity1), rd = 38 + Math.floor(104*opacity2) - r1,
                    g1 = 39 + Math.floor(103*opacity1), gd = 39 + Math.floor(103*opacity2) - g1,
                    b1 = 41 + Math.floor(101*opacity1), bd = 41 + Math.floor(101*opacity2) - b1;
                var width1 = 1 + node1.depth/30, widthD = (1 + node2.depth/30) - width1;
                var alpha1 = node1.depth/10, alphaD = (node2.depth/10) - alpha1;
                var subnodes = 4 + Math.floor((dx*dx + dy*dy)/700); // Subnode count based on distance
                var variance = subnodes/3; // Variance based on subnode count
                for(var k = 3; k >= 0; k--) { // Erase shade, draw shade, erase crack, draw crack
                    var drawContext = k < 2 ? context : lowContext;
                    var offset = k == 3 ? -1 : 0;
                    var lastCoord = [x1, y1], lastWidth = 0;
                    Math.seedrandom(x1*y1*x2*y2); // Generate same crack variations
                    for(var j = 0; j < subnodes; j++) {
                        drawContext.beginPath();
                        drawContext.moveTo(lastCoord[0], lastCoord[1]);
                        lastCoord = [
                            offset + x1 + (dx*(j+1))/(subnodes+1) + Math.random()*variance-variance/2,
                            offset + y1 + (dy*(j+1))/(subnodes+1) + Math.random()*variance-variance/2];
                        drawContext.lineTo(lastCoord[0] + offset,lastCoord[1] + offset);
                        lastWidth = width1+widthD*j/subnodes;
                        drawContext.lineWidth = lastWidth;
                        drawContext.strokeStyle = 'rgba(31, 32, 34, 1)';
                        drawContext.shadowColor = 'rgba(0, 0, 0, 0)';
                        switch(k) {
                            case 1: drawContext.lineWidth += 0.5; break;
                            case 3: drawContext.lineWidth = lastWidth*2 + 1; break;
                            case 2: 
                                drawContext.shadowColor = 'rgba(7, 8, 8, ' + (alpha1+alphaD*j/subnodes) + ')';
                                drawContext.shadowBlur = lastWidth*2;
                                drawContext.shadowOffsetX = drawContext.shadowOffsetY = lastWidth*-1+0.5;
                                break;
                            case 0: drawContext.strokeStyle = 'rgba(' +
                                    Math.floor((r1+rd*j/(subnodes-1))) + ', ' +
                                    Math.floor((g1+gd*j/(subnodes-1))) + ', ' +
                                    Math.floor((b1+bd*j/(subnodes-1))) + ', 1)';
                                break;
                        }
                        drawContext.stroke();
                    }
                    drawContext.beginPath();
                    drawContext.moveTo(lastCoord[0] + offset, lastCoord[1] + offset);
                    drawContext.lineTo(x2+ offset, y2 + offset);
                    drawContext.lineWidth = width1 + widthD;
                    drawContext.strokeStyle = 'rgba(31, 32, 34, 1)';
                    switch(k) {
                        case 1: drawContext.lineWidth += 0.5; break;
                        case 3: drawContext.lineWidth = lastWidth*2 + 0.5; break;
                        case 2:
                            drawContext.shadowColor = 'rgba(7, 8, 8, ' + (alpha1+alphaD) + ')';
                            drawContext.shadowBlur = (width1 + widthD)*2;
                            drawContext.shadowOffsetX = (width1 + widthD)*-1+0.5;
                            drawContext.shadowOffsetY = (width1 + widthD)*-1+0.5;
                            break;
                        case 0: drawContext.strokeStyle = 
                                'rgba(' + (r1+rd) + ', ' + (g1+gd) + ', ' + (b1+bd) + ', 1)';
                            break;
                    }
                    drawContext.stroke();
                }
            }
            if(nearNodes.length == 0) { // If a dot crack, draw a little circle
                var rs = 38 + Math.floor(104*nodes[x+':'+y].depth/10),
                    gs = 39 + Math.floor(103*nodes[x+':'+y].depth/10),
                    bs = 41 + Math.floor(101*nodes[x+':'+y].depth/10);
                context.beginPath();
                context.arc(ox, oy, 1 + nodes[x+':'+y].depth/10, 0, 2 * Math.PI, false);
                context.fillStyle = 'rgba(' + rs + ', ' + gs + ', ' + bs + ', ' + '1)';
                context.fill();
            }
//            context.beginPath();
//            context.arc(ox, oy, 2, 0, 2 * Math.PI, false);
//            context.fillStyle = 'red';
//            context.fill();
        },
        drawPixel: function(context,color,coords,size) {
            var method = color == 'erase' ? 'clearRect' : 'fillRect';
            var x = parseInt(coords[0]), y = parseInt(coords[1]);
            if(color != 'erase') { context.fillStyle = color.charAt(0) == 'r' ? color : '#' + color; }
            context[method](x*pixSize,y*pixSize,size[0]*pixSize,size[1]*pixSize);
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