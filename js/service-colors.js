/* Color gen service */

angular.module('Geographr.colors', [])
    .service('colorUtility', function() {
        var hsvToHex = function(hsv) {
            var h = hsv.hue, s = hsv.sat, v = hsv.val, rgb, i, data = [];
            if (s === 0) { rgb = [v,v,v]; } 
            else {
                h = h / 60; i = Math.floor(h);
                data = [v*(1-s), v*(1-s*(h-i)), v*(1-s*(1-(h-i)))];
                switch(i) {
                    case 0: rgb = [v, data[2], data[0]]; break;
                    case 1: rgb = [data[1], v, data[0]]; break;
                    case 2: rgb = [data[0], v, data[2]]; break;
                    case 3: rgb = [data[0], data[1], v]; break;
                    case 4: rgb = [data[2], data[0], v]; break;
                    default: rgb = [v, data[0], data[1]]; break;
                }
            }
            return rgb.map(function(x){ return ("0" + Math.round(x*255).toString(16)).slice(-2); }).join('');
        };
        var rgbToHex = function(r, g, b) {
            if (r > 255 || g > 255 || b > 255)
                throw "Invalid color component";
            return ((r << 16) | (g << 8) | b).toString(16);
        };
        var hexToRGB = function(hex) {
            var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        };
        var rgbToHSV = function(r, g, b) {
            r = r / 255; g = g / 255; b = b / 255;
            var rr, gg, bb, h, s, v = Math.max(r, g, b),
                diff = v - Math.min(r, g, b),
                diffC = function(c) { return (v - c) / 6 / diff + 1 / 2; };
            if (diff == 0) {
                h = s = 0;
            } else {
                s = diff / v; rr = diffC(r); gg = diffC(g); bb = diffC(b);
                if (r === v) { h = bb - gg; }
                else if (g === v) { h = (1 / 3) + rr - bb; }
                else if (b === v) { h = (2 / 3) + gg - rr; }
                if (h < 0) { h += 1; } else if (h > 1) { h -= 1; }
            }
            return { hue: Math.round(h * 360), sat: Math.round(s * 100)/100, val: Math.round(v * 100)/100 };
        };
        var hsvToHSL = function(h,s,v) { return { h: h,s: s*v/((h=(2-s)*v)<1?h:2-h),l: h/2} };
        var hexToHSV = function(hex) { var rgb = hexToRGB('#'+hex); return rgbToHSV(rgb.r,rgb.g,rgb.b); };
        var getAverages = function(palette) {
            if(!palette) { return false; }
            var hueTotal = 0, satTotal = 0, valTotal = 0, totalColors = 0;
            for(var palKey in palette) {
                if(palette.hasOwnProperty(palKey)) {
                    if(palette[palKey].hsv.hue - hueTotal/totalColors > 180) {
                        hueTotal += (360 - palette[palKey].hsv.hue + hueTotal/totalColors)*-1;
                    } else if (hueTotal/totalColors - palette[palKey].hsv.hue > 180) {
                        hueTotal += 360 + palette[palKey].hsv.hue;
                    } else {
                        hueTotal += palette[palKey].hsv.hue;
                    }
                    totalColors++;
                    satTotal += palette[palKey].hsv.sat;
                    valTotal += palette[palKey].hsv.val;
                }
            }
            var avgHue = hueTotal/(totalColors);
            var avgSat = satTotal/(totalColors);
            var avgVal = valTotal/(totalColors);
            if(avgHue >= 360) {
                avgHue = avgHue % 360;
            } else if (avgHue < 0) {
                avgHue = 360 + (avgHue % 360);
            }
            avgSat = Math.max(Math.min(avgSat,1),0);
            avgVal = Math.max(Math.min(avgVal,1),0);
            if(totalColors == 0) {
                return false;
            } else {
                return {
                    hue: avgHue,
                    sat: avgSat,
                    val: avgVal,
                    total: totalColors
                };
            }
            
        };
        var blendColors = function(oldColor, newColor, strength) {
            if(strength <= 0) { return oldColor; } else if(strength >= 1) { return newColor; }
            if(oldColor.hue - newColor.hue > 180) { // We should go up to reach new hue
                newColor.hue += 360;
            } else if(newColor.hue - oldColor.hue > 180) { // We should go down to reach new hue
                newColor.hue -= 360;
            }
            var hueOffset = (newColor.hue - oldColor.hue) * strength;
            var satOffset = (newColor.sat - oldColor.sat) * strength;
            var valOffset = (newColor.val - oldColor.val) * strength;
            var hsv = {
                hue: oldColor.hue+hueOffset,
                sat: oldColor.sat+satOffset,
                val: oldColor.val+valOffset
            };
            if(hsv.sat > 1) { hsv.sat = 1-hsv.sat%1; } // Fix out of bounds
            if(hsv.sat < 0) { hsv.sat = -1*(hsv.sat%-1); }
            if(hsv.val > 1) { hsv.val = 1-hsv.val%1; }
            if(hsv.val < 0) { hsv.val = -1*(hsv.val%-1); }
            if(hsv.hue >= 360) {
                hsv.hue = hsv.hue % 360;
            } else if (hsv.hue < 0) {
                hsv.hue = 360 + (hsv.hue % 360);
            }
            hsv.hue = Math.round(hsv.hue*100)/100; // Clean up long decimals
            hsv.sat = Math.round(hsv.sat*100)/100;
            hsv.val = Math.round(hsv.val*100)/100;
            return hsv;
        };
        var flip = function() { // Flip a coin
            return Math.floor(Math.random()*2) == 1;
        };
        return {
            generate: function(/* palette (array) OR maxMins (object has 'maxSat') OR object type (string) */) {
            //    var palette = jQuery.isArray(arguments[0]) ? arguments[0] : undefined;
                if(arguments[0]) {
                    var weight = arguments[0].hasOwnProperty('strength') ? arguments[0] : undefined;
                    var maxMins = arguments[0].hasOwnProperty('maxSat') ? arguments[0] : undefined;
                    var objectType = typeof arguments[0] == 'string' ? arguments[0] : undefined;
                }
            //    var averages = getAverages(palette);
                var hsv = {};
                if(weight) { hsv = blendColors(weight.oldColor, weight.newColor, weight.strength); } else
                if(maxMins) {
                    var hueRange = maxMins.maxHue - maxMins.minHue;
                    var satRange = maxMins.maxSat - maxMins.minSat;
                    var valRange = maxMins.maxVal - maxMins.minVal;
                    hsv = {
                        hue: Math.floor(Math.random()*hueRange + maxMins.minHue),
                        sat: Math.round(Math.random()*satRange + maxMins.minSat)/100,
                        val: Math.round(Math.random()*valRange + maxMins.minVal)/100
                    };
                } else if(objectType) {
                    switch(objectType) {
                        case 'camp':
                            hsv = {
                                hue: Math.floor(Math.random()*360),
                                sat: Math.round(Math.random()*60 + 40)/100,
                                val: Math.round(Math.random()*50 + 50)/100
                            }; break;
                        case 'nature':
                            hsv = {
                                hue: Math.floor(Math.random()*85 + 25),
                                sat: Math.round(Math.random()*15 + 15)/100,
                                val: Math.round(Math.random()*15 + 30)/100
                            }; break;
                        case 'mine-rock':
                            hsv = {
                                hue: Math.floor(Math.random()*30 + 5),
                                sat: Math.round(Math.random()*3)/100,
                                val: Math.round(Math.random()*5 + 35)/100
                            }; break;
                    }
                } else {
                    hsv = {
                        hue: Math.floor(Math.random()*360),
                        sat: Math.round(Math.random()*100)/100,
                        val: Math.round(Math.random()*100)/100
                    };
                }
                if(hsv.hue >= 360) { // Fix hue wraparound
                    hsv.hue = hsv.hue % 360;
                } else if (hsv.hue < 0) {
                    hsv.hue = 360 + (hsv.hue % 360);
                }
                return { hex: hsvToHex(hsv), hsv: hsv };
            },
            rgbToHex: rgbToHex,
            hexToRGB: hexToRGB,
            rgbToHSV: rgbToHSV,
            hsvToHSL: hsvToHSL,
            hsvToHex: hsvToHex,
            hexToHSV: hexToHSV
        }
});