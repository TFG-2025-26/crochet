import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Const } from 'three/tsl';

const CH_SIZE = 1;
const SIZE_X = 5; //ancho de un punto. constante.


const scene = new THREE.Scene();    //creamos la escena
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth/2 / window.innerHeight, 0.1, 1000 );    //creamos la cámara
                                        //( field of view,  aspect ratio, near and far clipping)

const renderer = new THREE.WebGLRenderer({ alpha: true }); //creamos el renderer    //el alpha true para q tenga en cuenta el alfa
renderer.setSize( window.innerWidth/2, window.innerHeight );

//me molestaba q el fondo fuese negro asiq vamos a cambiarlo
//scene.background = new THREE.Color( 0x000000, 0); //esto no está funcionando
renderer.setClearColor(0x000000, 0);  //haleluja  



//AHHH ESTO SELECCIONA Q PARTE DEL DOMUENTO VAMOS A PONER EL CANVAS
document.querySelector("#panes>.right").appendChild( renderer.domElement );

//q majos son, q tienen los controles built in
const controls = new OrbitControls( camera, renderer.domElement );


//ponemos una luz tontorrona para poder ver mejor
   const skyColor = 0xffffff;
const groundColor = 0x222222;  
const intensity = 1;
const light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
scene.add(light);

camera.position.z = 5;


function animate() {
  controls.update();

  renderer.render( scene, camera );
}
renderer.setAnimationLoop( animate ); //claro, por eso creamos un método para renderizar nuestro cubo
document.getElementById("knitBtn").addEventListener("click", generateMesh);

function generateMesh()
{
  var value = document.getElementById("input").value;
  const rounds = value.split("\n");
  
  var puntosIN = 0;
  for (var i = 0; i < rounds.length; i++)
  {
    
    const stitches = rounds[i].split(" ");
    //alert(rounds[i]);
    
    //si no es una linea vacia
    if(stitches.length > 0)
    {
      if(stitches.lenght < 2 || stitches[0] != "rnd" || stitches[1] != i+1)
      {
        alert("Formato incorrecto en la vuelta " + (i+1) + ". Debería empezar por rnd " + (i+1) + ". Revise el fomato de linea.");
        return;
      }

      //procesamos la linea correctamente
      else{
        var puntosOut = 0;
        
        //esto podría ser más limpio pero no me importa mucho por ahora
        if(stitches.length > 4 && stitches[2] == "-")
        {
          //aqui hacemos cosas de repetir vueltas, lo q sea
        }
        else
        {
          //a esto tengo q darle una vuelta para q sea mas limpio
          var j = 2;
          while (j < stitches.length)
          {
            var sizeY;
            switch (stitches[j])
            {
              case "ch":
                sizeY = CH_SIZE;
                break;

                default:
                  alert("Punto no reconocido en vuelta " + (i+1) + ": " + stitches[j] + ". Revise los puntos aceptados.");
                  return;

            }

            j++;
            for (var k = 0; k < stitches[j]; k++)
            {
              const geometry = new THREE.BoxGeometry( SIZE_X, sizeY, 1);
              const material = new THREE.MeshPhongMaterial( { color: 0x00ff00 } );  //aqui se asigna el color
              const cube = new THREE.Mesh( geometry, material );
              scene.add( cube );

            }
            puntosIN -= stitches[j];  //TODO ESTO HAY Q REVISARLO PARA ()TOG ETC ETC;
            j++;
          }
        }

      }
      puntosIN = puntosOut;
    }

  }

}