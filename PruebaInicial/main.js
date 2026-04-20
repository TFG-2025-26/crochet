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
const BRACKETS = {open: "(", close: ")"};
const CH = "ch";
const SKIP = "skip";

var closed = {isClosed: false, radious: 0};
const DIRECTION = Object.freeze({AV: 1, RET: -1});
var curr_direction = DIRECTION.RET;


////////////INICIALIZACIÓN DE TODO/////////////

const container = document.querySelector("#panes>.right");

const width = container.clientWidth;
const height = container.clientHeight;

const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000); //creamos la cámara
                                                                          //( field of view,  aspect ratio, near and far clipping)

const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(width, height);

//AHHH ESTO SELECCIONA Q PARTE DEL DOMUENTO VAMOS A PONER EL CANVAS
container.appendChild(renderer.domElement);
//document.querySelector("#panes>.right").appendChild( renderer.domElement );


const scene = new THREE.Scene();    //creamos la escena

//me molestaba q el fondo fuese negro asiq vamos a cambiarlo
//scene.background = new THREE.Color( 0x000000, 0); //esto no está funcionando
renderer.setClearColor(0x000000, 0);  //haleluja  


//q majos son, q tienen los controles built in
const controls = new OrbitControls( camera, renderer.domElement );


//ponemos una luz tontorrona para poder ver mejor
   const skyColor = 0xffffff;
const groundColor = 0x222222;  
const intensity = 4;
const light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
scene.add(light);

camera.position.z = 5;

function animate() {
  controls.update();

  renderer.render( scene, camera );
}
renderer.setAnimationLoop( animate ); //claro, por eso creamos un método para renderizar nuestro cubo
document.getElementById("knitBtn").addEventListener("click", generateMesh);

//para q sea responsive dentro de lo q cabe
window.addEventListener('resize', () => {
  const width = container.clientWidth;
  const height = container.clientHeight;

  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});



//////////////////////////////////////////LO Q SE EJECUTA CADA VEZ Q GENERAMOS LA MESH///////////////////////////////////////////////////



//ahora mismo el la cosa mas tocha de la galaxia. Tiene espacio de mejora.
function generateMesh()
{
  var value = document.getElementById("input").value;
  value = value.toLowerCase();
  
  closed = {isClosed: false, radious: 0}
  curr_direction = DIRECTION.RET;

  const rounds = processRounds(value);

  if (rounds == -1) //si ha habido un error en el preprocesado, paramos
  {
    return;
  }
  
  //empezamos a generar la mesh
  var positions = [];
  var indices = [];

  var roundInfo =
  {prevRoundOUT : 0, 
    currRoundIN : 0, 
    currRoundOUT : 0, 
    chainsToPlace : 0, 
    prevRoundStitches : [], 
    currRoundStitches : [],
    prevRoundJoined : false}

  //hacemos la primera vuelta:
  generateFirstRound(roundInfo, closed, rounds[0], positions, indices);


  //y ahora hacemos el resto de vueltas
  for (var i = 1; i < rounds.length; i++)
  {    
    const stitches = rounds[i]
    
    roundInfo.prevRoundOUT =  roundInfo.currRoundOUT
    roundInfo.prevRoundStitches = roundInfo.currRoundStitches
    roundInfo.currRoundStitches = []
    roundInfo.currRoundIN = 0;
    roundInfo.currRoundOUT = 0;
    
    generateRound(indices, positions, stitches, roundInfo)
    
  }

  //añadimos nuestra geometria
  refreshGeometry(positions, indices)
}


//METODO PARA PROCESAR LAS VUELTAS, POR AHORA MUY SIMPLE Y TONTO, PARA QUITAR LOS SIGINIFANTES RND Y REPETIR LAS VUELTAS UN NUMERO CORRECTO DE VECES
function processRounds(input)
{
  //TODO: AÑADIR COMPROBACIÓN DE Q LA PRIMERA VUELTA ES VÁLIDA
  var roundsIN = input.split("\n");
  var roundsOUT = [];
  var nVueltas = 1;
  var errorFound = false; var i = 0;
  closed.isClosed = false;
  

  var roundInfo = {prevRoundOUT : 0, currRoundIN : 0, currRoundOUT : 0};
  while (i < roundsIN.length && !errorFound)
  {
    var puntosIN =  roundsIN[i].split(" ").filter(function(i){return i});  //el filter es para q puedas poner tantos especios en blanco como quieras

   if(puntosIN.length > 0)
    {
      
      var nReps = 1;
      var nRndWords = 2;
      var error = validateRoundHeader(puntosIN, nVueltas)
      if (error != null)
      {
        alert(error)
        errorFound = true;
      }

      else
      {
        //vemos si son varias vueltas:
        if (puntosIN.length > 4 && puntosIN[2] == "-")
        {
          nReps = puntosIN[3] - nVueltas +1;
          nRndWords = 4;
        }

        if(!errorFound)
        {
          roundInfo.prevRoundOUT = roundInfo.currRoundOUT;
          roundInfo.currRoundIN = 0;
          roundInfo.currRoundOUT = 0;
  
          //traducimos la vuelta
          var puntosOut = processRound(roundInfo, closed, puntosIN, nRndWords, false)
          if (puntosOut == -1)
            errorFound = true;

          else
          {
            //si son varias vueltas:
            for(var j = 0; j < nReps; j++)
            {
              roundsOUT.push(puntosOut.slice());
            }
            nVueltas+= nReps;

            console.log(puntosOut)
            console.log(roundsOUT)
          }
        }
      }
    i++
    }

  }
  
  if(!errorFound)
  {
    return roundsOUT;
  }
    
  else
    return -1;
}

function processRound(roundInfo, closed, puntosIN, startIndex, inInParenthesis)
{
  var j = startIndex
  var puntosOut = []
  var errorFound
  while (j < puntosIN.length && !errorFound)
  {
    if (!(puntosIN[j] in SIZES_Y) && puntosIN[j] != JOIN && puntosIN[j]!= TURN && puntosIN[j]!= BRACKETS.open && puntosIN[j]!= BRACKETS.close)
    {
      alert("Punto no reconocido en vuelta " + (i+1) + ": " + puntosIN[j] + ". Revise los puntos aceptados.");
      errorFound = true;
    }
    else if(puntosIN[j]== JOIN)
    {
      if (j < puntosIN.length -1)
      {
        alert("Error en la vuelta " + (i+1)+ ". Join solamente puede ser usado al final de una vuelta. Revise el formato de vuelta");
        errorFound = true;
      }
      else if (!closed.isClosed)  //calculamos el radio
      {
        closed.isClosed = true;
        closed.radious = SIZE_X / (2 * Math.sin(Math.PI /roundInfo.currRoundOUT)) 
      }
      puntosOut.push(JOIN)
      j++;
    }
    else if(puntosIN[j]== TURN)
    {
      puntosOut.push(TURN);
      j++;
    }

    else if(puntosIN[j]== BRACKETS.open)
    {
      

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

  if (!errorFound)
    return puntosOut
  else
    return -1

}


function validateRoundHeader(puntosIN, nVueltas)
{
  var error = null;
  if(puntosIN.length < 2 || puntosIN[0] != "rnd" || puntosIN[1] != nVueltas)
    error = ("Formato incorrecto en la vuelta " + nVueltas + ". Debería empezar por \"rnd " + nVueltas + "\". Revise el fomato de linea.");
  
  //vemos si son varias vueltas:
  if (puntosIN.length > 4 && puntosIN[2] == "-")
  {
    if(parseInt(puntosIN[3],10).toString() !== puntosIN[3] || puntosIN[3] <= nVueltas)
      error = ("Formato incorrecto en la vuelta " + nVueltas + ". Revise el uso de guiones (-).");
  }

  //vemos si acaba en join o turn
  if(!closed.isClosed && puntosIN[puntosIN.length-1] != JOIN && puntosIN[puntosIN.length-1] != TURN)
    error = ("Error al final de la vuelta " + (i+1) + ". Trabajando en plano, una vuelta debe acabar en \"join\", \"turn\" o \"F/o\".");

  return error;

}

function generateFirstRound(roundInfo, closed, stitches, positions, indices)
{
  if(stitches[0] == MAGICRING)
  {
    //por ahora pues nada

  }

  else  //si no es un mr, tienen q ser cadenetas
  {

    if (!closed.isClosed)
    {
        //primero toda la capa de abajo
      for (var i = 0; i < stitches.length; i++) {
        positions.push(SIZE_X * i, 0, 0);
      }

      //la capa de arriba (para q tenga sentido en nuestra arquitectura)
      for (var i = 0; i < stitches.length; i++) {
        roundInfo.currRoundStitches.push(positions.length/3)
        roundInfo.prevRoundJoined = true;
        positions.push(SIZE_X * i, SIZES_Y[CH], 0);
      }

    }
    else  //los colocamos en circulo
    {
      var theta = 2 * Math.asin(SIZE_X/ (2* closed.radious));
      
      var disp = 0.02
      if (stitches[stitches.length -1] == JOIN) 
      {
        disp = 0;
        curr_direction = DIRECTION.AV
        roundInfo.lastRoundJoined = true
      }

      //primero toda la capa de abajo
      for (var i = 0; i < stitches.length; i++) {
        var ang = i * theta;
        var x = (closed.radious + i *disp) * Math.cos(ang);
        var z = (closed.radious + i *disp) * Math.sin(ang);
        positions.push(x, 0, z);
      }

      //la capa de arriba (para q tenga sentido en nuestra arquitectura)
      for (var i = 0; i < stitches.length; i++) {
        var ang = i * theta;
        var x = (closed.radious + i *disp) * Math.cos(ang);
        var z = (closed.radious + i *disp) * Math.sin(ang);
        roundInfo.currRoundStitches.push(positions.length/3)
        positions.push(x, SIZES_Y[CH], z);
      }

    }

    //y ahora los indexamos todos
    for(var i = 0; i < stitches.length-1; i++)
    {
      const b0 = i;
      const b1 = i + 1;
      const t0 = i + stitches.length;
      const t1 = i + 1 + stitches.length;

      indices.push(b0, t0, b1);
      indices.push(t0, t1, b1);

      roundInfo.currRoundOUT++;
    }

  }
  

}

function generateRound(indices, positions, stitches, roundInfo)
{
  var currStitch = 0;

  while (currStitch < stitches.length)
  {
    if (stitches[currStitch] == CH)
      roundInfo.chainsToPlace++;

    else
    {

      if(stitches[currStitch] == JOIN)
      {
        curr_direction = DIRECTION.AV
        roundInfo.lastRoundJoined = true
      }
      
      else if (stitches[currStitch] == TURN)
      {
        curr_direction = DIRECTION.RET
        roundInfo.lastRoundJoined = false
      }

      else  //si es un punto normal
      {
        //TODO: COMPROBAR CHAINS TO PLACE ETC
    
        var prevBotom1 = 0;
        var prevBotom2 = 0;
        var prevtop = 0;
        var actTop = 0;
        
        if(curr_direction == DIRECTION.AV)  //vamos en espiral, avanzando
        {
          prevBotom1 = roundInfo.prevRoundStitches[roundInfo.currRoundIN];
          prevBotom2 = roundInfo.prevRoundStitches[roundInfo.currRoundIN+1]
        }

        else
        {
          prevBotom1 = roundInfo.prevRoundStitches[roundInfo.prevRoundOUT - roundInfo.currRoundIN];
          prevBotom2 = roundInfo.prevRoundStitches[roundInfo.prevRoundOUT - roundInfo.currRoundIN -1];
        }
          
        if(roundInfo.currRoundIN == 0) //si es el primer punto, ponemos el primer vertice
        {
          roundInfo.currRoundStitches.push(positions.length/3)
          
          if (roundInfo.lastRoundJoined && stitches.includes(TURN))
          {
            placeVertexStitch(positions, SIZES_Y[stitches[currStitch]], prevBotom1, 0.05)
          }
          
          
          else
            placeVertexStitch(positions, SIZES_Y[stitches[currStitch]], prevBotom1)
          
        }
        prevtop = roundInfo.currRoundStitches.at(-1)

    
        if(currStitch + 1 >= stitches.length || stitches[currStitch+1] != JOIN) //si el siguiente no es un join, ponemos el punto nuevo
        {
          roundInfo.currRoundStitches.push(positions.length/3)
          placeVertexStitch(positions, SIZES_Y[stitches[currStitch]], prevBotom2)
          actTop = positions.length/3 - 1;
        }

        else  //si si q es un join, unimos
        {
          actTop = roundInfo.currRoundStitches[0]
          roundInfo.currRoundStitches.push(roundInfo.currRoundStitches[0])
        }
        
    
        //anyways, hacemos nuestros triangulos
        makeTriangles(indices, prevBotom1, prevBotom2, prevtop, actTop)

        //y añadimos los puntos
        roundInfo.currRoundIN ++;
        roundInfo.currRoundOUT ++;
      }
    }
    currStitch++
  } 

}

function placeVertexStitch(positions, sizeY, bottom, offset = 0)
{
  const baseIndex = bottom * 3;
          
  const x = positions[baseIndex];
  const y = positions[baseIndex + 1];
  const z = positions[baseIndex + 2];
  
  positions.push(x + offset, y + sizeY, z + offset);

}

function makeTriangles(indices, prevBotom1, prevBotom2, prevtop, actTop)
{
  indices.push(prevBotom1);
  indices.push(prevtop);
  indices.push(prevBotom2); 

  indices.push(prevtop);
  indices.push(actTop); 
  indices.push(prevBotom2);  

}

function refreshGeometry(positions, indices)
{
  scene.clear();

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  geometry.setIndex(indices);

  const material = new THREE.MeshStandardMaterial({
  color: 0x8A2BE2,
  //wireframe: true,
  flatShading: true,
  side: THREE.DoubleSide
  //depthTest: false
  });

  material.needsUpdate = true;
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const edges = new THREE.EdgesGeometry(geometry, 1);
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });

  const wireframe = new THREE.LineSegments(edges, lineMaterial);
  mesh.add(wireframe);

  const skyColor = 0xffffff;
  const groundColor = 0x222222;  
  const intensity = 6;
  const light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
  scene.add(light);

}