import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Const, round } from 'three/tsl';
import { TSL } from 'three/webgpu';

const SIZE_X = 1; //ancho de un punto. constante.

const SIZES_Y ={
  "ch" : 0.2,
  "sc" : 1,
  "dc" : 2
}

const TURN = "turn";
const JOIN = "join";
const MAGICRING = "mr";
const CH = "ch";
const SKIP = "skip";

var closed = {isClosed: false, radious: 0};
const DIRECTION = Object.freeze({AV: 1, RET: -1});
var curr_direction = DIRECTION.RET;


////////////INICIALIZACIÓN DE TODO/////////////
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



//////////////////////////////////////////LO Q SE EJECUTA CADA VEZ Q GENERAMOS LA MESH///////////////////////////////////////////////////



//ahora mismo el la cosa mas tocha de la galaxia. Tiene espacio de mejora.
function generateMesh()
{
  var value = document.getElementById("input").value;
  value = value.toLowerCase();
  
  const rounds = processRounds(value);
  console.log(closed);

  if (rounds == -1) //si ha habido un error en el preprocesado, paramos
  {
    return;
  }
  
  //empezamos a generar la mesh (posiblemente sea mejor hacerlo en dos pasos)
  const geometry = new THREE.BufferGeometry();
  var positions = [];
  var indices = [];

  var roundInfo =
  {prevRoundOUT : 0, currRoundIN : 0, currRoundOUT : 0, chainsToPlace : 0}

  //hacemos la primera vuelta:
  if(rounds[0][0] == MAGICRING)
  {
    //por ahora pues nada

  }

  else  //si no es un mr, tienen q ser cadenetas
  {
    roundInfo.currRoundOUT = 0;
    const stitches = rounds[0]

    if (!closed.isClosed)
    {
        //primero toda la capa de abajo
      for (var i = 0; i < stitches.length+1; i++) {
        positions.push(SIZE_X * i, 0, 0);
      }

      //la capa de arriba (para q tenga sentido en nuestra arquitectura)
      for (var i = 0; i < stitches.length+1; i++) {
        positions.push(SIZE_X * i, SIZES_Y[CH], 0);
      }

    }
    else  //los colocamos en circulo
    {
      var theta = 2 * Math.asin(SIZE_X/ (2* closed.radious));

      //primero toda la capa de abajo
      for (var i = 0; i < stitches.length+1; i++) {
        var ang = i * theta;
        var x = closed.radious * Math.cos(ang);
        var z = closed.radious * Math.sin(ang);
        positions.push(x, 0, z);
      }

      //la capa de arriba (para q tenga sentido en nuestra arquitectura)
      for (var i = 0; i < stitches.length+1; i++) {
        var ang = i * theta;
        var x = closed.radious * Math.cos(ang);
        var z = closed.radious * Math.sin(ang);
        positions.push(x, SIZES_Y[CH], z);
      }
      console.log(closed.radious)

    }

    
     
    //y ahora los indexamos todos
    for(var i = 0; i < stitches.length; i++)
    {
      const b0 = i;
      const b1 = i + 1;
      const t0 = i + stitches.length+1;
      const t1 = i + 1 + stitches.length+1;

      indices.push(b0, t0, b1);
      indices.push(t0, t1, b1);

      roundInfo.currRoundOUT++;
      //TODO comprobamos si el último punto es turn o join, lo cual de hecho ya lo sabemos
    }

  }


  //y ahora hacemos el resto de vueltas
  for (var i = 1; i < rounds.length; i++)
  {    
    const stitches = rounds[i]
    closed.isClosed = false;
    
    roundInfo.prevRoundOUT = roundInfo.currRoundOUT;
    roundInfo.currRoundIN = 0;
    roundInfo.currRoundOUT = 0;
    var j = 0;
    var firstInRound;
    if(curr_direction == DIRECTION.AV)
    {
      firstInRound = positions.length/3 - roundInfo.prevRoundOUT;
    }
    else
    {
      firstInRound =  positions.length/3;
    }
    while (j < stitches.length)
    {
      switch (stitches[j])
      {
        case CH:
          roundInfo.chainsToPlace ++;

        default:
          break;
      }

      //si es un punto, vemos primero si tenemos alguna cadeneta q resolver
      if(stitches[j] != CH && roundInfo.chainsToPlace != 0)
      {
          //por ahora nada
      }

      var prevBotom1 = 0;
      var prevBotom2 = 0;
      if(curr_direction == DIRECTION.AV)  //vamos en espiral, avanzando
      {
        //vemos cual es el siguiente punto
        var prevBotom1 = firstInRound + roundInfo.currRoundIN -1;
        var prevBotom2 = prevBotom1 + 1;
      }
      else
      {
        var prevBotom1 = firstInRound - roundInfo.currRoundIN -1;
        var prevBotom2 = prevBotom1 - 1;
      }

      if(roundInfo.currRoundIN == 0) //si es el primer punto, ponemos el primer vertice
      {
        const baseIndex = prevBotom1 * 3;

        const x = positions[baseIndex];
        const y = positions[baseIndex + 1];
        const z = positions[baseIndex + 2];

        positions.push(x, y + SIZES_Y[stitches[j]], z);
      }

      var prevtop = positions.length/3 - 1;

      //y ahora ponemos nuestro vertice
      const baseIndex = prevBotom2 * 3;

      const x = positions[baseIndex];
      const y = positions[baseIndex + 1];
      const z = positions[baseIndex + 2];

      positions.push(x, y + SIZES_Y[stitches[j]], z);
      var actTop = positions.length/3 - 1;

      //anyways, hacemos nuestros triangulos

      //segun mis calculos, para hacer un triangulo dentro de la misma vuelta, vas como de dos en dos tanto arriba como abajo
      indices.push(prevBotom1);  //prev bottom
      indices.push(prevtop);   //prev top
      indices.push(prevBotom2);     //act botom

      //segundo tringulo
      indices.push(prevtop); //prev top
      indices.push(actTop);  //act top
      indices.push(prevBotom2);   //act bottom

      j++;

      //y añadimos los puntos
      roundInfo.currRoundIN ++;
      roundInfo.currRoundOUT ++;
      
    }
    
  }

  

  //añadimos nuestra geometria
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    geometry.setIndex(indices);

      const material = new THREE.MeshBasicMaterial({
  color: 0x00ff00,
  wireframe: true,
  side: THREE.DoubleSide,
  depthTest: false
});

const mesh = new THREE.Mesh(geometry, material);
scene.clear();
scene.add(mesh);

}

//METODO PARA PROCESAR LAS VUELTAS, POR AHORA MUY SIMPLE Y TONTO, PARA QUITAR LOS SIGINIFANTES RND Y REPETIR LAS VUELTAS UN NUMERO CORRECTO DE VECES
function processRounds(input)
{
  //TODO: AÑADIR COMPROBACIÓN DE Q LA PRIMERA VUELTA ES VÁLIDA
  var roundsIN = input.split("\n");
  var roundsOUT = [];
  var nVueltas = 0;
  var errorFound = false; var i = 0;
  

  var roundInfo = {prevRoundOUT : 0, currRoundIN : 0, currRoundOUT : 0};
  while (i < roundsIN.length && !errorFound)
  {
    var puntosIN =  roundsIN[i].split(" ").filter(function(i){return i});  //el filter es para q puedas poner tantos especios en blanco como quieras

   if(puntosIN.length > 0)
    {
      nVueltas++;
      var nReps = 1;
      var nRndWords = 2;
      if(puntosIN.length < 2 || puntosIN[0] != "rnd" || puntosIN[1] != nVueltas)
      {
        alert("Formato incorrecto en la vuelta " + nVueltas + ". Debería empezar por \"rnd " + nVueltas + "\". Revise el fomato de linea.");
        errorFound = true;
      }
      
      //vemos si son varias vueltas:
      if (puntosIN.length > 4 && puntosIN[2] == "-")
      {
        if(! parseInt(puntosIN[3],10).toString()===puntosIN[3] && puntosIN[3] > nVueltas)
        {
          alert("Formato incorrecto en la vuelta " + nVueltas + ". Revise el uso de guiones (-).");
          errorFound = true;
        }
        nReps = puntosIN[3] - nVueltas +1;
        nRndWords = 4;

      }


      if(!errorFound)
      {
        roundInfo.prevRoundOUT = roundInfo.currRoundOUT;
        roundInfo.currRoundIN = 0;
        roundInfo.currRoundOUT = 0;

        //traducimos la vuelta
        var puntosOut = [];
        var j = nRndWords;
        while (j < puntosIN.length && !errorFound)
        {
          if (!(puntosIN[j] in SIZES_Y) && puntosIN[j] != JOIN)
          {
            alert("Punto no reconocido en vuelta " + (i+1) + ": " + puntosIN[j] + ". Revise los puntos aceptados.");
            errorFound = true;
          }
          else if(puntosIN[j]== JOIN)
          {
            if (j < puntosIN.length -1)
            {
              alert("Error en la vuelta: " + (i+1)+ ". Join solamente puede ser usado al final de una vuelta. Revise el formato de vuelta");
              errorFound = true;
            }
            else if (!closed.isClosed)  //calculamos el radio
            {
              closed.isClosed = true;
              closed.radious = SIZE_X / (2 * Math.sin(Math.PI /roundInfo.currRoundOUT)) 
              console.log(closed.radious);
            }
            j++;
          }

          else
          {
            var repeat = 1;
            var st = puntosIN[j];
            j++;
            if(parseInt(puntosIN[j],10).toString()===puntosIN[j]) //esto es una manera fancy de comprobar q es un numero
            {
              repeat = parseInt(puntosIN[j], 10);
              j++;

            }
            puntosOut.push(...Array(repeat).fill(st)); //metemos el punto ese numero de veces
            //contamos el punto como in y como out
            if(st != CH)
            {
              roundInfo.currRoundIN += repeat;
            }
            if (st != SKIP)
            {
              roundInfo.currRoundOUT += repeat;
            }

            if (roundInfo.currRoundIN > roundInfo.prevRoundOUT)
            {
              errorFound = true;
              alert("número incorrecto de puntos en la vuelta " + (i+1) + ". Revise sus cálculos.");
            }

          }
        }
        
        //si son varias vueltas:
        for(j = 0; j < nReps; j++)
        {
          roundsOUT.push(puntosOut.slice());
        }
      
      
      }

    }
    i++

    
  }

  if(!errorFound)
  {
    console.log(roundsOUT);
    return roundsOUT;
  }
    
  else
    return -1;
}

