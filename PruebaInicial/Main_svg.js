import { SVG } from '@svgdotjs/svg.js'

//vamos a añadir lo q hagamos en body (pero puede ser en cualquier otra sección)
var draw = SVG().addTo('body').size(300, 300)
//hacemos nuestro rectángulo
var rect = draw.rect(100, 100).attr({ fill: '#f06' })
//y si lo animamos venga vamos
rect.animate(2000, 1000, 'now').move(150, 150).loop(100)