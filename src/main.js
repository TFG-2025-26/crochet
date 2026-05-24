import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const SIZE_X = 1; //ancho de un punto. constante.

const ACCEPTABLE_SIZE_X_ERROR = 0.05

const SIZES_Y ={
  "ch" : 0.2,
  "sc" : 1,
  "dc" : 2,
  "slst" : 0.05,
  "hdc" : 1.5
}

const TURN = "turn";
const JOIN = "join";
const MAGICRING = "mr";
const BRACKETS = {open: "(", close: ")"};
const CH = "ch";
const SKIP = "skip";

let closed = {isClosed: false, radious: 0};
const DIRECTION = Object.freeze({AV: 1, RET: -1});
let curr_direction = DIRECTION.RET;


////////////INICIALIZACIÓN/////////////

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
  let value = document.getElementById("input").value;
  value = value.toLowerCase();
  
  closed = {isClosed: false, radious: 0}
  curr_direction = DIRECTION.RET;

  const rounds = processRounds(value);

  if (rounds === -1) //si ha habido un error en el preprocesado, paramos
  {
    return;
  }
  
  //empezamos a generar la mesh
  let positions = [];
  let indices = [];

  let roundInfo =
  {prevRoundOUT : 0, 
    currRoundIN : 0, 
    currRoundOUT : 0, 
    chainsToPlace : 0, 
    prevRoundStitches : [], 
    currRoundStitches : [],
    prevRoundJoined : false,
    stitchesToAlign: []}

  //hacemos la primera vuelta:
  generateFirstRound(roundInfo, closed, rounds[0], positions, indices);


  //y ahora hacemos el resto de vueltas
  for (let i = 1; i < rounds.length; i++)
  {    
    const stitches = rounds[i]
    
    roundInfo.prevRoundOUT =  roundInfo.currRoundOUT
    roundInfo.prevRoundStitches = roundInfo.currRoundStitches
    roundInfo.currRoundStitches = []
    roundInfo.stitchesToAlign = []
    roundInfo.currRoundIN = 0;
    roundInfo.currRoundOUT = 0;
    
    generateRound(indices, positions, stitches, roundInfo)
    relaxAndAdjustStitches(positions, roundInfo)
    alignTogVertexes(positions, roundInfo.stitchesToAlign)
    
  }

  //añadimos nuestra geometria
  refreshGeometry(positions, indices)
}


////////////////////////FUNCIONES PARA PROCESAR EL INPUT //////////////////
function processRounds(input)
{
  let roundsIN = input.split("\n");
  let roundsOUT = [];
  let nVueltas = 1;
  let errorFound = false; let i = 0;
  closed.isClosed = false;


  let roundInfo = {prevRoundOUT : 0, currRoundIN : 0, currRoundOUT : 0};
  while (i < roundsIN.length && !errorFound)
  {
    let puntosIN =  roundsIN[i].split(" ").filter(function(i){return i});  //el filter es para q puedas poner tantos especios en blanco como quieras

   if(puntosIN.length > 0)
    {
      
      let nReps = 1;
      let nRndWords = 2;
      let error = validateRoundHeader(puntosIN, nVueltas)
      if (error != null)
      {
        alert(error)
        errorFound = true;
      }

      else
      {
        //vemos si son varias vueltas:
        if (puntosIN.length > 4 && puntosIN[2] === "-")
        {
          nReps = puntosIN[3] - nVueltas +1;
          nRndWords = 4;
        }

        if(!errorFound)
        {
  
          //traducimos la vuelta
          let result = -1;
          try {
            if (nVueltas > 1)
            {
              result = processRound(puntosIN, nRndWords, false)
              if (result.currRoundIN > roundInfo.prevRoundOUT)
              {
                throw new Error(
                    `Hay demasiados puntos. Has contado bien el número de puntos de la vuelta anterior?`
                );
              }
            }
            else
            {
              result = processFirstRound(puntosIN, nRndWords)
            }
          }
          catch (err)
          {
            alert("error en la vuelta " + (nVueltas) + ": " + err.message)
            return -1;
          }

          if (result.puntosOut[result.puntosOut.length - 1] === JOIN && !closed.isClosed) {
            closed.isClosed = true;
            closed.radious =
                SIZE_X / (2 * Math.sin(Math.PI / result.currRoundOUT));
          }

          let round = removeRedundancies(result.puntosOut);
          //si son varias vueltas:
          for(let j = 0; j < nReps; j++)
          {
            roundsOUT.push(round.slice());
          }
          nVueltas+= nReps;

          roundInfo.prevRoundOUT = result.currRoundOUT;

        }
      }
    }
    i++

  }
  if(roundsOUT[0][0] === MAGICRING && roundsOUT.length > 1)
  {
    closed.isClosed = true;
    roundsOUT[1] = removeRedundanciesFirstRound(roundsOUT[1])
    closed.radious = SIZE_X / (2 * Math.sin(Math.PI / (roundsOUT[1].length - 1)))
    roundsOUT[1] = roundsOUT[0].concat(roundsOUT[1]);
    roundsOUT.shift();
  }

  console.log(roundsOUT);

  if(!errorFound)
  {
    return roundsOUT;
  }
    
  else
    return -1;
}

function processFirstRound(puntosIN, startIndex)
{
  let j = startIndex;
  let puntosOut = [];
  let currRoundOUT = 0;
  let currRoundIN = Number.MAX_SAFE_INTEGER;


  while (j < puntosIN.length) {
    if(puntosIN[j] === CH)
    {
      const result = parseStitch(puntosIN, j);

      j = result.j;
      currRoundOUT += result.stitches.length;
      puntosOut.push(...result.stitches);
    }

    else if (puntosIN[j] === MAGICRING)
    {
      if ((puntosIN.length - startIndex) > 1)
      {
        throw new Error(
            `si usas mr (Magic ring), la vuelta debe acabar (sin join ni turn)`
        );

      }
      currRoundOUT = Number.MAX_SAFE_INTEGER;
      puntosOut.push(MAGICRING)
      j++
    }

    else if (puntosIN[j] === JOIN || puntosIN[j] === TURN) {

      if (j < puntosIN.length - 1) {
        throw new Error(`Join o Turn solamente pueden ser usados al final de una vuelta.`);
      }

      puntosOut.push(puntosIN[j]);
      j++
    }

    else
    {
      throw new Error(
          `En la primera vuelta solo se permite el uso de ch y mr (uno u otro, no ambos). No se pueden usar tampoco parentésis.`
      );
    }

  }

  return { puntosOut,
    currRoundIN,
    currRoundOUT};

}

function processRound(puntosIN, startIndex, inInParenthesis) {
  let j = startIndex;
  let puntosOut = [];

  let currRoundIN = 0;
  let currRoundOUT = 0;


  while (j < puntosIN.length) {
    validatePoint(puntosIN[j]);

    if (puntosIN[j] === JOIN || puntosIN[j] === TURN) {

      if (j < puntosIN.length - 1) {
        throw new Error(
            `Join o Turn solamente pueden ser usados al final de una vuelta.`
        );
      }

      if (inInParenthesis) {
        throw new Error(
            `Tienes que cerrar el paréntesis antes de usar Join o Turn`
        );
      }

      puntosOut.push(puntosIN[j]);
      j++
    }
    else if (puntosIN[j] === BRACKETS.open) {
      const result = processRound(puntosIN, j+1, true);

      j = result.j + 1;
      if (puntosIN[j] === "tog")
      {
        currRoundIN += result.currRoundIN;
        currRoundOUT += 1;

        puntosOut.push(puntosIN[j]);
        puntosOut.push(result.puntosOut);
        j++;
      }

      else if (puntosIN.length > j+2 && puntosIN[j] === "in" && puntosIN[j+1] === "same" && puntosIN[j+2] === "st")
      {
        currRoundIN += 1;
        currRoundOUT += result.currRoundOUT;

        puntosOut.push("insamest");
        puntosOut.push(result.puntosOut);
        j+=3;
      }

      else
      {
        let repeat = 1;
        if (puntosIN[j] === "x")
        {
          j++
          if (j < puntosIN.length && parseInt(puntosIN[j], 10).toString() === puntosIN[j]) {
            repeat = parseInt(puntosIN[j], 10);
            j++;
          }
        }

        for (let x = 0; x < repeat; x++)
        {
          puntosOut = puntosOut.concat(result.puntosOut);
        }

        currRoundIN += result.currRoundIN * repeat;
        currRoundOUT += result.currRoundOUT * repeat;

      }


    }
    else if (puntosIN[j] === BRACKETS.close) {
      if (inInParenthesis) {
        return {
          puntosOut,
          currRoundIN,
          currRoundOUT,
          j
        };
      }

      throw new Error(`Uy, este paréntesis ')' no tiene pareja. ¿Te has olvidado de '(' ?`);
    }
    else {
      const result = parseStitch(puntosIN, j);

      j = result.j;
      currRoundIN += result.currRoundIN;
      currRoundOUT += result.currRoundOUT;
      puntosOut.push(...result.stitches);
    }
  }

  if (inInParenthesis) {  //no debería nunca llegar aqui
    throw new Error(`Abres un paréntesis que nunca cierras`);
  }

  return {
    puntosOut,
    currRoundIN,
    currRoundOUT,
    j
  };
}


function validatePoint(stitch) {
  const valid =
      stitch in SIZES_Y ||
      stitch === SKIP ||
      stitch === JOIN ||
      stitch === TURN ||
      stitch === BRACKETS.open ||
      stitch === BRACKETS.close;

  if (!valid) {
    throw new Error(`Punto no reconocido: ${stitch}. Revise los puntos aceptados.`);
  }
}

function parseStitch(puntosIN, j) {
  let repeat = 1;
  let currRoundIN = 0; let currRoundOUT = 0;
  const stitch = puntosIN[j];
  j++;

  if (j < puntosIN.length && parseInt(puntosIN[j], 10).toString() === puntosIN[j]) {
    repeat = parseInt(puntosIN[j], 10);
    j++;
  }

  const stitches = Array(repeat).fill(stitch);

  if (stitch !== CH) {
    currRoundIN += repeat;
  }

  if (stitch !== SKIP && stitch !== CH) {
    currRoundOUT += repeat;
  }

  return {
    j,
    currRoundIN,
    currRoundOUT,
    stitches
  };
}

function validateRoundHeader(puntosIN, nVueltas)
{
  let error = null;
  if(puntosIN.length < 2 || puntosIN[0] !== "rnd" || parseInt(puntosIN[1], 10) !== nVueltas)
    error = ("Formato incorrecto en la vuelta " + nVueltas + ". Debería empezar por \"rnd " + nVueltas + "\". Revise el fomato de linea.");

  //vemos si son varias vueltas:
  if (puntosIN.length > 4 && puntosIN[2] === "-")
  {
    if(parseInt(puntosIN[3],10).toString() !== puntosIN[3] || puntosIN[3] <= nVueltas)
      error = ("Formato incorrecto en la vuelta " + nVueltas + ". Revise el uso de guiones (-).");
  }

  //vemos si acaba en join o turn
  if(puntosIN[puntosIN.length -1] !== MAGICRING && nVueltas !== 0 &&  puntosIN[puntosIN.length-1] !== JOIN && puntosIN[puntosIN.length-1] !== TURN)
    error = ("Error al final de la vuelta " + nVueltas + ". Una vuelta debe acabar en \"join\", \"turn\" o \"F/o\".");

  return error;

}


/////////////////////////FUNCIONES AUXILIARES DE POST-PARSEO ///////////////////////////////////////////////
function removeRedundancies(stitches)
{
  let cleaned = [];
  for (let i = 0; i < stitches.length; i++)
  {
    if (stitches[i] === "tog" || stitches[i] === "insamest")
    {
      let insideRedundant = removeRedundancies(stitches[i+1]);
      let insideCleaned = []
      for(let j = 0; j < insideRedundant.length; j++)
      {
        if (insideRedundant[j] in SIZES_Y)
        {
          insideCleaned.push(insideRedundant[j]);
        }

        else if (insideRedundant[j] === stitches[i])
        {
          insideCleaned = insideCleaned.concat(insideRedundant[j+1]);
          j++
        }

        else  //si es tog dentro de insamest o viceversa
        {
          let st = findSmaller(insideRedundant[j+1]);
          insideCleaned.push(st)
          j++

        }


      }
      if (insideCleaned.length > 1)
      {
        cleaned.push(stitches[i]);
        cleaned.push(insideCleaned);
      }
      else
      {
        cleaned = cleaned.concat(insideCleaned);

      }
      i++
    }
    else
    {
      cleaned.push(stitches[i]);
    }
  }
  return cleaned;

}

function removeRedundanciesFirstRound(stitches)
{
  let cleaned = [];
  for (let i = 0; i < stitches.length; i++)
  {
    if (stitches[i] === "insamest")
    {
      i++
      cleaned = cleaned.concat(stitches[i]);
    }
    else if (stitches[i] === "tog")
    {
      i++
      let st = findSmaller(stitches[i]);
      cleaned.push(st)
    }
    else
    {
      cleaned.push(stitches[i]);
    }
  }
  return cleaned;

}

function findSmaller(stitches)
{
  let smallest = "dc"
  for(let i = 0; i < stitches.length; i++)
  {
    if(stitches[i] in SIZES_Y)
    {
      if (SIZES_Y[stitches[i]] < SIZES_Y[smallest])
      {
        smallest = stitches[i];
      }
    }
    else if (stitches[i] === "tog" || stitches[i] === "insamest")
    {
      let res = findSmaller(stitches[i+1]);
      if (SIZES_Y[res] < SIZES_Y[smallest])
      {
        smallest = res;
      }
      i++

    }

  }

  return smallest;
}

////////////////////////////////FUNCIONES DE COLOCADO DE PUNTOS ////////////////////////////
function generateFirstRound(roundInfo, closed, stitches, positions, indices)
{
  if(stitches[0] === MAGICRING)
  {
    positions.push(0, 0, 0);

    //montamos la capa de arriba
    //calculamos ángulos
    let theta = 2 * Math.asin(SIZE_X/ (2* closed.radious));

    let disp = 0.02
    if (stitches[stitches.length -1] === JOIN)
    {
      disp = 0;
      curr_direction = DIRECTION.AV
      roundInfo.lastRoundJoined = true
    }

    //el primer punto
    let x = (closed.radious) * Math.cos(0);
    let z = (closed.radious) * Math.sin(0);
    roundInfo.currRoundStitches.push(positions.length/3)
    positions.push(x, SIZES_Y[stitches[1]], z);

    //el resto
    for (let i = 1; i < stitches.length -1; i++) {
      let ang = i * theta;
      x = (closed.radious + i *disp) * Math.cos(ang);
      z = (closed.radious + i *disp) * Math.sin(ang);
      roundInfo.currRoundStitches.push(positions.length/3)
      positions.push(x, SIZES_Y[stitches[i]], z);
    }


    //Los unimos e indexamos
    //y ahora los indexamos todos
    for(let i = 0; i < roundInfo.currRoundStitches.length-1; i++)
    {
      const b0 = 0;
      const b1 = 0
      const t0 = roundInfo.currRoundStitches[i];
      const t1 = roundInfo.currRoundStitches[i+1];

      indices.push(b0, t0, b1);
      indices.push(t0, t1, b1);

      roundInfo.currRoundOUT++;
    }
    roundInfo.prevRoundJoined = true;

  }

  else  //si no es un mr, tienen q ser cadenetas
  {

    if (!closed.isClosed)
    {
        //primero toda la capa de abajo
      for (let i = 0; i < stitches.length; i++) {
        positions.push(SIZE_X * i, 0, 0);
      }

      //la capa de arriba (para q tenga sentido en nuestra arquitectura)
      for (let i = 0; i < stitches.length; i++) {
        roundInfo.currRoundStitches.push(positions.length/3)
        roundInfo.prevRoundJoined = true;
        positions.push(SIZE_X * i, SIZES_Y[CH], 0);
      }

    }
    else  //los colocamos en circulo
    {
      let theta = 2 * Math.asin(SIZE_X/ (2* closed.radious));
      
      let disp = 0.02
      if (stitches[stitches.length -1] === JOIN)
      {
        disp = 0;
        curr_direction = DIRECTION.AV
        roundInfo.lastRoundJoined = true
      }

      //primero toda la capa de abajo
      for (let i = 0; i < stitches.length; i++) {
        let ang = i * theta;
        let x = (closed.radious + i *disp) * Math.cos(ang);
        let z = (closed.radious + i *disp) * Math.sin(ang);
        positions.push(x, 0, z);
      }

      //la capa de arriba (para q tenga sentido en nuestra arquitectura)
      for (let i = 0; i < stitches.length; i++) {
        let ang = i * theta;
        let x = (closed.radious + i *disp) * Math.cos(ang);
        let z = (closed.radious + i *disp) * Math.sin(ang);
        roundInfo.currRoundStitches.push(positions.length/3)
        positions.push(x, SIZES_Y[CH], z);
      }

    }

    //y ahora los indexamos todos
    for(let i = 0; i < stitches.length-1; i++)
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
  let currStitch = 0;

  while (currStitch < stitches.length)
  {
    if (stitches[currStitch] === CH)
      roundInfo.chainsToPlace++;

    else
    {

      if(stitches[currStitch] === JOIN)
      {
        curr_direction = DIRECTION.AV
        roundInfo.lastRoundJoined = true
      }

      else if (stitches[currStitch] === TURN)
      {
        curr_direction = DIRECTION.RET
        roundInfo.lastRoundJoined = false
      }
      else if (stitches[currStitch] === SKIP)
      {
        roundInfo.currRoundIN++;
      }

      else  //si es un punto normal
      {
        //TODO: CHAINS

        let prevBotom1 = 0;
        let prevBotom2 = 0;
        let prevtop = 0;

        if(curr_direction === DIRECTION.AV)  //vamos en espiral, avanzando
        {
          prevBotom1 = roundInfo.prevRoundStitches[roundInfo.currRoundIN];
          prevBotom2 = roundInfo.prevRoundStitches[roundInfo.currRoundIN+1]
        }

        else
        {
          prevBotom1 = roundInfo.prevRoundStitches[roundInfo.prevRoundOUT - roundInfo.currRoundIN];
          prevBotom2 = roundInfo.prevRoundStitches[roundInfo.prevRoundOUT - roundInfo.currRoundIN -1];
        }

        if(roundInfo.currRoundIN === 0) //si es el primer punto, ponemos el primer vertice
        {
          let size_y
          if (stitches[currStitch] in SIZES_Y)
            size_y = SIZES_Y[stitches[currStitch]]

          else if (stitches[currStitch] === "tog" || stitches[currStitch] === "insamest")
            size_y = SIZES_Y[stitches[currStitch +1][0]]

          roundInfo.currRoundStitches.push(positions.length/3)

          if (roundInfo.lastRoundJoined && stitches.includes(TURN))
          {
            let offset = unitVectorBetween2DPoints([positions[prevBotom1*3], positions[prevBotom1*3 +2]], [0, 0])
            placeVertexStitch(positions, size_y, prevBotom1, [0.05 * offset[0], 0.05 * offset[1]])
          }


          else
            placeVertexStitch(positions, size_y, prevBotom1)

          console.log(size_y)

        }
        prevtop = roundInfo.currRoundStitches.at(-1)


        if (stitches[currStitch] === "insamest")
        {
          let join = !(currStitch + 2 >= stitches.length || stitches[currStitch+2] !== JOIN)
          currStitch++
          handleInSameSt(indices, positions, stitches[currStitch], prevBotom1, prevBotom2, prevtop, roundInfo, join)

        }
        else if(stitches[currStitch] === "tog")
        {
          let join = !(currStitch + 2 >= stitches.length || stitches[currStitch+2] !== JOIN)
          currStitch++
          handleTog(indices, positions, stitches[currStitch], prevBotom1, prevtop, roundInfo, join)

        }
        else
        {
          let join = !(currStitch + 1 >= stitches.length || stitches[currStitch+1] !== JOIN)
          handleNormalStitch(indices, positions, stitches[currStitch], prevBotom1, prevBotom2, prevtop, roundInfo, join)
        }


      }
    }
    currStitch++
  }

  console.log(roundInfo.currRoundStitches)

}

function handleNormalStitch(indices, positions, stitch, prevBottom1, prevBottom2, prevTop, roundInfo, join= false)
{

  let actTop
  if (join)  //si si q es un join, unimos
  {
    actTop = roundInfo.currRoundStitches[0]
    roundInfo.currRoundStitches.push(roundInfo.currRoundStitches[0])
  }
  else
  {
    roundInfo.currRoundStitches.push(positions.length/3)
    placeVertexStitch(positions, SIZES_Y[stitch], prevBottom2)
    actTop = positions.length/3 - 1;
  }


  //anyways, hacemos nuestros triangulos
  makeTriangles(indices, prevBottom1, prevBottom2, prevTop, actTop)

  //y añadimos los puntos
  roundInfo.currRoundIN ++;
  roundInfo.currRoundOUT ++;

}

function handleInSameSt(indices, positions, stitches, prevBottom1, prevBottom2, prevTop, roundInfo, join = false)
{
  let distance, vector;

  [distance, vector] = distanceBetweenVertex(positions, prevBottom1, prevBottom2);
  let step = distance/stitches.length;


  let bottom1 = prevBottom1;
  let top1 = prevTop;


  for (let i = 0; i < stitches.length; i++) {


    let bottom2
    if (i === stitches.length - 1) {
      bottom2 = prevBottom2;

    }
    else {
      placeVertexWithOffset(positions, bottom1, step * vector[0], step * vector[1], step * vector[2]);
      bottom2 = positions.length / 3 - 1;
    }


    let top2
    if (i === stitches.length - 1 && join)
    {
      top2 = roundInfo.currRoundStitches[0]

    }
    else
    {
      //colocamos el top q queda
      placeVertexStitch(positions, SIZES_Y[stitches[i]], bottom2, );
      top2 = positions.length/3 - 1;
    }


    makeTriangles(indices, bottom1, bottom2, top1, top2)


    bottom1 = bottom2
    top1 = top2

    roundInfo.currRoundStitches.push(top2)
    roundInfo.currRoundOUT ++;

  }
  roundInfo.currRoundIN ++;

}

function handleTog(indices, positions, stitches, prevBottom, prevTop, roundInfo, join = false)
{
  //cogemos cual va a ser nuestro punto más bajo (el q marque la altura del punto)
  let Size_y = SIZES_Y[findSmaller(stitches)]
  console.log(stitches)
  console.log(Size_y)

  let bottom1 = prevBottom
  let top1 = prevTop
  let top2 = top1
  let intermediateSts = []
  intermediateSts.push(top1)

  //colocamos los triángulos, solo metiendo el primero y el último en el array
  //roundInfo.currRoundStitches.push(top1)
  for (let i = 0; i < stitches.length; i++) {


    let bottom2

    if(curr_direction === DIRECTION.AV)
    {bottom2 = roundInfo.prevRoundStitches[roundInfo.currRoundIN+1]}
    else
    {bottom2 = roundInfo.prevRoundStitches[roundInfo.prevRoundOUT - roundInfo.currRoundIN -1]}



    if (i === stitches.length - 1 && join)
    {
      top2 = roundInfo.currRoundStitches[0]
    }
    else
    {
      //colocamos el top q queda
      placeVertexStitch(positions, Size_y, bottom2);
      top2 = positions.length/3 - 1;
    }

    console.log(bottom1, bottom2, top1, top2)
    makeTriangles(indices, bottom1, bottom2, top1, top2)


    bottom1 = bottom2
    top1 = top2


    roundInfo.currRoundIN++;
    intermediateSts.push(top2)

  }
  roundInfo.currRoundOUT++;
  roundInfo.currRoundStitches.push(top1)

  //registramos todos los puntos intermedios
  roundInfo.stitchesToAlign.push(intermediateSts)


}

function relaxAndAdjustStitches(positions, roundInfo)
{
  const correction = 0.1;
  const radialCorrection = 0.2;
  const maxIteration = 200;
  let center;
  let r;


  let allEven = false;
  let iterations = 0

  while (!allEven && iterations < maxIteration)
  {
    [center, r] = findSmallestCircumference(positions, roundInfo.currRoundStitches);
    allEven = true;
    for (let i = 0; i < roundInfo.currRoundOUT; i++)
    {
      let v1 = roundInfo.currRoundStitches[i]
      let v2 = roundInfo.currRoundStitches[i+1]
      let dist; let vector
      [dist, vector] = distanceBetweenVertex(positions, v1, v2);
      if (dist < (SIZE_X - ACCEPTABLE_SIZE_X_ERROR) || dist > (SIZE_X + ACCEPTABLE_SIZE_X_ERROR))
      {
        allEven = false;
        const newSize = Math.max(SIZE_X - ACCEPTABLE_SIZE_X_ERROR, Math.min(SIZE_X + ACCEPTABLE_SIZE_X_ERROR, dist))
        const diff = newSize - dist;
        const radiousIncrease = radialCorrection * diff * 0.5

        //movemos el primer vertice
        let vectorFromCenter = unitVectorBetween2DPoints( [positions[v1*3], positions[v1*3 +2]], center)
        positions[v1*3] = positions[v1*3]- correction * (vector[0] * (diff/2) )+ radiousIncrease*vectorFromCenter[0];
        positions[v1*3 +1] = positions[v1*3 +1]- correction * (vector[1] * (diff/2) )
        positions[v1*3 +2] = positions[v1*3 +2]- correction * (vector[2] * (diff/2) )+ radiousIncrease*vectorFromCenter[1];

        //movemos el segundo
        vectorFromCenter = unitVectorBetween2DPoints( [positions[v2*3], positions[v2*3 +2]], center)
        positions[v2*3] = positions[v2*3] + correction * (vector[0] * (diff/2) ) + radiousIncrease*vectorFromCenter[0];
        positions[v2*3 +1] = positions[v2*3 +1] + correction * vector[1] * (diff/2);
        positions[v2*3 +2] = positions[v2*3 +2] + correction * (vector[2] * (diff/2) ) + radiousIncrease*vectorFromCenter[1];


      }

    }
    laplacianRelaxation(positions, roundInfo);
    iterations++

  }

}

function laplacianRelaxation(positions, roundInfo)
{
  const correction = 0.0015;
  let i = 1
  if (roundInfo.currRoundStitches[0] === roundInfo.currRoundStitches[-1])
    i = 0

  for (i; i < roundInfo.currRoundOUT +1; i++) {
    const curr = roundInfo.currRoundStitches[i];
    let prev = 0;
    if (i === 0)
      prev = roundInfo.currRoundStitches[-2]

    else
      prev = roundInfo.currRoundStitches[(i - 1)];

    let next = 0
    if (i === roundInfo.currRoundOUT)
      next = roundInfo.currRoundStitches[1];
    else
      next = roundInfo.currRoundStitches[(i + 1)];


    const avgX = (positions[prev * 3] + positions[next * 3]) / 2;
    const avgY = (positions[prev * 3 + 1] + positions[next * 3 + 1]) / 2;
    const avgZ = (positions[prev * 3 + 2] + positions[next * 3 + 2]) / 2;

    positions[curr * 3] += correction * (avgX - positions[curr * 3]);
    positions[curr * 3 + 1] += correction * (avgY - positions[curr * 3 + 1]);
    positions[curr * 3 + 2] += correction * (avgZ - positions[curr * 3 + 2]);
  }
}

function alignTogVertexes(positions, vertexes)
{
  for (let i = 0; i < vertexes.length; ++i)
  {
    if (vertexes[i].length > 2) {


      const firstVertex = vertexes[i][0];
      const lastVertex = vertexes[i][vertexes[i].length - 1];

      const firstIndex = firstVertex * 3;
      const lastIndex = lastVertex * 3;

      const x1 = positions[firstIndex];
      const y1 = positions[firstIndex + 1];
      const z1 = positions[firstIndex + 2];

      // posición final
      const x2 = positions[lastIndex];
      const y2 = positions[lastIndex + 1];
      const z2 = positions[lastIndex + 2];

      const totalSteps = vertexes[i].length - 1;

      // vector paso entre vértices
      const stepX = (x2 - x1) / totalSteps;
      const stepY = (y2 - y1) / totalSteps;
      const stepZ = (z2 - z1) / totalSteps;

      // mover solo los intermedios
      for (let j = 1; j < vertexes[i].length - 1; j++) {
        const vertex = vertexes[i][j];
        const index = vertex * 3;

        positions[index] = x1 + stepX * j;
        positions[index + 1] = y1 + stepY * j;
        positions[index + 2] = z1 + stepZ * j;
      }
    }

  }
}

//////////////////////// FUNCIONES AUXILIARES PARA LIDIAR CON LA GEOMETRIA CUSTOM /////////////////////
function placeVertexStitch(positions, sizeY, bottom, offset = [0, 0])
{
  const baseIndex = bottom * 3;

  const x = positions[baseIndex];
  const y = positions[baseIndex + 1];
  const z = positions[baseIndex + 2];

  positions.push(x + offset[0], y + sizeY, z + offset[1]);

}

function placeVertexWithOffset(positions, base, offsetX, offsetY, offsetZ)
{
  const baseIndex = base * 3;

  const x = positions[baseIndex];
  const y = positions[baseIndex + 1];
  const z = positions[baseIndex + 2];

  positions.push(x + offsetX, y + offsetY, z + offsetZ);

}

function placeVertexWithOffsetRespectPoint(positions, base, offsetX, offsetY, offsetZ)
{

  const x = base[0];
  const y = base[1];
  const z = base[2];

  positions.push(x + offsetX, y + offsetY, z + offsetZ);

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

////////////////////////////FUNCIONES AUXILIARES DE CÁLCULOS GENÉRICOS/////////////////////////////////////////
function distanceBetweenVertex(positions, vertex1, vertex2)
{
  const baseIndex1 = vertex1 * 3;

  let x1 = positions[baseIndex1];
  let y1 = positions[baseIndex1 + 1];
  let z1 = positions[baseIndex1 + 2];

  const baseIndex2 = vertex2 * 3;

  let x2 = positions[baseIndex2];
  let y2 = positions[baseIndex2 + 1];
  let z2 = positions[baseIndex2 + 2];

  const dx = x2 - x1;
  const dy = y2 - y1;
  const dz = z2 - z1;

  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

  const unitVector =
      distance === 0
          ? [0, 0, 0]
          : [dx / distance, dy / distance, dz / distance];

  return[distance, unitVector]

}


function distanceBetween2DPoints(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function unitVectorBetween2DPoints(a, b)
{
  let dist = Math.hypot(a[0] - b[0], a[1] - b[1])

  return dist === 0 ? [0, 0] : [(a[0] - b[0]) / dist, (a[1] - b[1]) / dist];

}

function circleFrom2Points(a, b) {
  const cx = (a[0] + b[0]) / 2;
  const cy = (a[1] + b[1]) / 2;
  return [cx, cy, distanceBetween2DPoints(a, b) / 2];
}

function circleFrom3Points(a, b, c) {
  const d = 2 * (
      a[0] * (b[1] - c[1]) +
      b[0] * (c[1] - a[1]) +
      c[0] * (a[1] - b[1])
  );

  if (Math.abs(d) < 1e-12) return null; // collinear

  const ux =
      (
          (a[0] ** 2 + a[1] ** 2) * (b[1] - c[1]) +
          (b[0] ** 2 + b[1] ** 2) * (c[1] - a[1]) +
          (c[0] ** 2 + c[1] ** 2) * (a[1] - b[1])
      ) / d;

  const uy =
      (
          (a[0] ** 2 + a[1] ** 2) * (c[0] - b[0]) +
          (b[0] ** 2 + b[1] ** 2) * (a[0] - c[0]) +
          (c[0] ** 2 + c[1] ** 2) * (b[0] - a[0])
      ) / d;

  return [ux, uy, distanceBetween2DPoints([ux, uy], a)];
}

function circleContainsAllPoints(circle, radius, pts, eps = 1e-8) {
  for (const p of pts) {
    if (distanceBetween2DPoints([circle[0], circle[1]], p) > radius + eps) {
      return false;
    }
  }
  return true;
}

function findSmallestCircumference(positions, indexes) {
  let pts = []
  for (let i = 0; i < indexes.length; i++)
  {
    let x = positions[indexes[i]* 3];
    let z = positions[indexes[i] * 3 +2];

    pts.push([x, z]);
  }

  // Barajamos por eficiencia
  for (let i = pts.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [pts[i], pts[j]] = [pts[j], pts[i]];
  }

  let circle = null;
  let radius = 0;

  for (let i = 0; i < pts.length; i++) {
    if (circle && distanceBetween2DPoints([circle[0], circle[1]], pts[i]) <= radius) continue;

    circle = [pts[i][0], pts[i][1]];
    radius = 0;

    for (let j = 0; j < i; j++) {
      if (distanceBetween2DPoints([circle[0], circle[1]], pts[j]) <= radius) continue;

      const c = circleFrom2Points(pts[i], pts[j]);
      if (c) {
        const [cx, cy, r] = c;

        if (circleContainsAllPoints([cx, cy], r, pts)) {
          [circle[0], circle[1], radius] = c;
        }
      }

      for (let k = 0; k < j; k++) {
        if (distanceBetween2DPoints([circle[0], circle[1]], pts[k]) <= radius) continue;

        const c = circleFrom3Points(pts[i], pts[j], pts[k]);
        if (c) {
          const [cx, cy, r] = c;

          if (circleContainsAllPoints([cx, cy], r, pts)) {
            [circle[0], circle[1], radius] = c;
          }
        }
      }
    }
  }

  return [circle, radius];
}

//////////////////////////////////////REFRESCAR GEOMETRÍA /////////////////////////////////////////
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
  //let normals = geometry.getAttribute('normal');
  //relaxByNormals(positions, normals.array);
  //geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

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

function relaxByNormals(positions, normals)
{
  for (let i = 0; i < positions.length/3 ; i++)
  {
    const amount = 0.3 * (Math.random() - 0.5);
    positions[i*3]     += amount * normals[i*3];
    //positions[i*3 +1]  += amount * normals[i*3 +1];
    positions[i*3 +2]  += amount * normals[i*3 +2];
  }
}