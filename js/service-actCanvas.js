/* Activity canvas drawing service */

angular.module('Geographr.actCanvas', [])
.service('actCanvasUtility', function(canvasUtility,colorUtility) {
        var eventLowCanvas = document.getElementById('eventLowCanvas'); // Event view
        var eventMainCanvas = document.getElementById('eventMainCanvas');
        var eventHighCanvas = document.getElementById('eventHighCanvas');
        var eventLowContext = eventLowCanvas.getContext ? eventLowCanvas.getContext('2d') : null;
        var eventMainContext = eventMainCanvas.getContext ? eventMainCanvas.getContext('2d') : null;
        var eventHighContext = eventHighCanvas.getContext ? eventHighCanvas.getContext('2d') : null;
        eventLowCanvas.onselectstart = function() { return false; };
        eventMainCanvas.onselectstart = function() { return false; };
        eventHighCanvas.onselectstart = function() { return false; };
        var mouse = [-1,-1];
        eventHighCanvas.style.cursor = 'crosshair';
        jQuery(eventHighCanvas).on('mousemove',function(e) {
            return; // Not using this for now
            var offset = jQuery(eventHighCanvas).offset(); // Get pixel location
            var x = e.pageX - offset.left < 0 ? 0 : Math.floor((e.pageX - offset.left));
            var y = e.pageY - offset.top < 0 ? 0 : Math.floor((e.pageY - offset.top));
            if(mouse[0] != x && mouse[1] != y) {
                mouse = [x,y];
            }
        });
        var bgColor = '24272b';
        var flip = function() { return Math.random() > 0.5; }; // Flip a coin
        var clear = function() {
            canvasUtility.fillCanvas(eventLowContext,bgColor);
            eventMainContext.clearRect(0,0,300,300);
            eventHighContext.clearRect(0,0,300,300);
        };
        var drawNoiseLines = function(count,intensity) {
            for(var i = 0; i < count; i++) {
                eventLowContext.beginPath();
                switch(Math.floor(Math.random()*2)) {
                    case 0: eventLowContext.moveTo(0,Math.floor(Math.random()*300));
                        eventLowContext.lineTo(300,Math.floor(Math.random()*300)); break;
                    case 1: eventLowContext.moveTo(Math.floor(Math.random()*300),0);
                        eventLowContext.lineTo(Math.floor(Math.random()*300),300); break;
                }
                var alpha = ',' + Math.floor(Math.random()*intensity)/100;
                eventLowContext.strokeStyle = 'rgba(200,200,200' + alpha + ')'; eventLowContext.stroke();
            }
        };
        var drawCircle = function(which,location,size,color) {
            var context = which == 'low' ? eventLowContext :
                which == 'main' ? eventMainContext : eventHighContext;
            context.beginPath();
            context.arc(location[0],location[1],size, 0, Math.PI*2);
            context.closePath(); context.fillStyle = color; context.fill();
        };
        return {
            fillCanvas: function(context,color) {
                var method = color == 'erase' ? 'clearRect' : 'fillRect';
                if(color != 'erase') { context.fillStyle = color.charAt(0) == 'r' ? color : '#' + color; }
                context[method](0,0,1200,750);
            },
            drawLine: function(which,pointA,pointB,color) {
                var context = which == 'low' ? eventLowContext : 
                    which == 'main' ? eventMainContext : eventHighContext;
                context.lineWidth = 1; context.strokeStyle = color;
                context.beginPath();
                context.moveTo(pointA[0],pointA[1]); context.lineTo(pointB[0],pointB[1]);
                context.stroke();
            },
            drawCircle: drawCircle,
            drawText: function(coords,size,text) {
                var x = parseInt(coords[0]), y = parseInt(coords[1]);
                eventHighContext.font = size + 'px Arial'; eventHighContext.textAlign = 'center';
                eventHighContext.textBaseline = 'middle'; eventHighContext.fillStyle = 'rgba(0,0,0,0.8)';
                eventHighContext.shadowColor = 'black'; 
                eventHighContext.shadowOffsetX = eventHighContext.shadowOffsetY = 0;
                eventHighContext.shadowBlur = 1;
                eventHighContext.fillText(text,x+1,y+1);
                eventHighContext.fillStyle = 'white';
                eventHighContext.fillText(text,x,y);
                eventHighContext.shadowColor = 'rgba(0,0,0,0)';
            },
            drawActivity: function(type,event) {
                var p, i;
                switch(type) {
                    case 'forage':
                        clear(); // Clear event canvases
                        Math.seedrandom(event.seed); drawNoiseLines(9,35);
                        for(p = 0; p < event.pool.length; p++) {
                            eventMainContext.beginPath();
                            eventMainContext.strokeStyle = '#' + event.pool[p].product.color;
                            eventMainContext.lineWidth = 1 + // Line width based on product amount above average
                                (event.pool[p].product.amount - event.pool[p].product.avgQty)/1.5;
                            Math.seedrandom(event.seed+event.pool[p].targetX); // Consistent event redraws
                            for(i = 0; i < 3; i++) {
                                switch(Math.floor(Math.random()*4)) {
                                    case 0: eventMainContext.moveTo(0,Math.floor(Math.random()*300)); break;
                                    case 1: eventMainContext.moveTo(300,Math.floor(Math.random()*300)); break;
                                    case 2: eventMainContext.moveTo(Math.floor(Math.random()*300),0); break;
                                    case 3: eventMainContext.moveTo(Math.floor(Math.random()*300),300); break;
                                }
                                eventMainContext.lineTo(event.pool[p].targetX,event.pool[p].targetY);
                            }
                            eventMainContext.stroke();
                        }
                        eventMainContext.clearRect(50,50,200,200);
                        break;
                    case 'hunt':
                        clear(); // Clear event canvases
                        Math.seedrandom(event.seed); drawNoiseLines(16,50);
                        if(event.step % 5 > 0) {
                            var animal = event.pool[Math.floor(event.step/5)];
                            if(event.step % 5 > 0) { // If not pausing between animals
                                Math.seedrandom(event.seed + animal.targetX);
                                eventMainContext.shadowColor = 'black'; eventMainContext.shadowBlur = 7;
                                eventMainContext.shadowOffsetX = eventMainContext.shadowOffsetY = 0;
                                var distance = 1 - event.step % 5 / 4;
                                var takenEdges = [];
                                for(i = 0; i < 2; i++) {
                                    var edge;
                                    var which = Math.floor(Math.random()*4);
                                    while(jQuery.inArray(which,takenEdges) >= 0) { // Prevent picking same edge
                                        which = Math.floor(Math.random()*4)
                                    }
                                    takenEdges.push(which);
                                    switch(which) {
                                        case 0: edge = [20,Math.floor(Math.random()*260+20)]; break;
                                        case 1: edge = [280,Math.floor(Math.random()*260+20)]; break;
                                        case 2: edge = [Math.floor(Math.random()*260+20),20]; break;
                                        case 3: edge = [Math.floor(Math.random()*260+20),280]; break;
                                    }
                                    var delta = [edge[0] - animal.targetX,edge[1] - animal.targetY];
                                    drawCircle('main',[animal.targetX + delta[0]*distance,
                                        animal.targetY + delta[1]*distance],10,'#'+animal.product.color);

                                }
                                eventMainContext.shadowColor = 'rgba(0,0,0,0)';
                            }
                        }
                        break;
                }
            },
            eventHighCanvas: jQuery(eventHighCanvas), eventHighContext: eventHighContext
        }
});