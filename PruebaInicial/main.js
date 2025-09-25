import * as THREE from 'three';

const scene = new THREE.Scene();    //creamos la escena
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );    //creamos la cámara
                                        //( field of view,  aspect ratio, near and far clipping)

const renderer = new THREE.WebGLRenderer({ alpha: true }); //creamos el renderer    //el alpha true para q tenga en cuenta el alfa
renderer.setSize( window.innerWidth, window.innerHeight );

//me molestaba q el fondo fuese negro asiq vamos a cambiarlo
//scene.background = new THREE.Color( 0x000000, 0); //esto no está funcionando
renderer.setClearColor(0x000000, 0);  //haleluja  

//esto no entiendo exactamente q hace pero un besazo supongo
document.body.appendChild( renderer.domElement );

//ahora a crear nuestro cubo

const geometry = new THREE.BoxGeometry( 1, 1, 1 );
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );  //aqui se asigna el color
const cube = new THREE.Mesh( geometry, material );
scene.add( cube );

camera.position.z = 5;


//y aqui renderizamos nuestro cubo
function animate() {
  //VAMOS A ANIMAR EL CUBO???
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;

  renderer.render( scene, camera );
}
renderer.setAnimationLoop( animate ); //claro, por eso creamos un método para renderizar nuestro cubo