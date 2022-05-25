/**
 * Exercício Programa 02 - Boids
 * (código base retirado das aulas de MAC0420)
 * 
 * Nome: Lara Ayumi Nagamatsu
 * NUSP: 9910568
 * 
 */

 "use strict";

 // ==================================================================
 // constantes globais
 
 const FUNDO = [0, 1, 1, 1];

 // ==================================================================
 // variáveis globais
 var gl;
 var gCanvas;
 var gShader = {};  // encapsula globais do shader
 var num_peixes = 1;
 var jogo_estate = true;
 
 // cria a matriz de projeção - pode ser feita uma única vez
 var projection = mat4(
   1, 0, 0, 0,
   0, 1, 0, 0,
   0, 0, 1, 0,
   0, 0, 0, 1
 );
 
 var colorBufTris;
 var bufPosTris;

 // Os códigos fonte dos shaders serão descritos em 
 // strings para serem compilados e passados a GPU
 var gVertexShaderSrc;
 var gFragmentShaderSrc;
 
 // Define o objeto a ser desenhado: uma lista de vértices
 // com coordenadas no intervalo (0,0) a (200, 200)
 var gUltimoT = Date.now();
 
 // para usar no VAO
 var gTris = [];
 var raio = 0.3;

 var gCoresTris = [];
 var gPosicoesTris = [];

 var directionKey;
 
 // ==================================================================
 // chama a main quando terminar de carregar a janela
 window.onload = main;

  /**
  * programa principal.
  */
  function main() {
  gCanvas = document.getElementById("glcanvas");
  gl = gCanvas.getContext('webgl2');
  if (!gl) alert("WebGL 2.0 isn't available");

  console.log("Canvas: ", gCanvas.width, gCanvas.height);

  //gTris.push(new Triangle(50, 50, 100, 25, 95, 25, 25, sorteieCorRGBA(), false));
  gTris.push(new Triangle(0.5, 0.5, 0.5, 0.5, 95, 0.1, 0.1, sorteieCorRGBA(), false));

  // shaders
  crieShaders();

  // Inicializações feitas apenas 1 vez
  // define como mapear coordenadas normalidas para o canvas
  //gl.viewport(0, 0, gCanvas.width, gCanvas.height);
  // limpa o contexto
  gl.clearColor(FUNDO[0], FUNDO[1], FUNDO[2], FUNDO[3]);

  window.onkeyup = callbackKeyUp;

  // finalmente...
  desenhe();
  }


// Controle pelo teclado
function callbackKeyUp(e) {
  const keyName = e.key;
  console.log(keyName);
  directionKey = keyName;

  switch (keyName) {
      case 'p':
          console.log('Pause');
          directionKey = 'p';
          jogo_estate = !jogo_estate;
          break;
  }

}
 
 /**
  * cria e configura os shaders
  */
 function crieShaders() {
   //  cria o programa
   gShader.program = makeProgram(gl, gVertexShaderSrc, gFragmentShaderSrc);
   gl.useProgram(gShader.program);
 
   // Criar VAO para os quads
   gShader.trisVAO = gl.createVertexArray();
   gl.bindVertexArray(gShader.trisVAO);
 
   // cria buffer
   bufPosTris = gl.createBuffer();
   colorBufTris = gl.createBuffer();

   // carrega dados nos shaders
   carregaShaders();

   // resolve os uniforms
   gShader.uMatrix = gl.getUniformLocation(gShader.program, "uMatrix");
   gl.bindVertexArray(null); // apenas boa prática
 
 };

function carregaShaders() {
  // bind 
  gl.bindBuffer(gl.ARRAY_BUFFER, bufPosTris);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(gPosicoesTris), gl.STATIC_DRAW);
  // habilita atributos
  var aPosTris = gl.getAttribLocation(gShader.program, "aPosition");
  gl.vertexAttribPointer(aPosTris, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPosTris);
  //  buffer de cores
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBufTris);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(gCoresTris), gl.STATIC_DRAW);
  var aColorTris = gl.getAttribLocation(gShader.program, "aColor");
  gl.vertexAttribPointer(aColorTris, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aColorTris);

}
 
 /**
  * Usa o shader para desenhar.
  * Assume que os dados já foram carregados e são estáticos.
  */
 function desenhe() {

   if (directionKey == '+') {

     gTris.push(new Triangle(0.1, 0.3, 0.5, 0.5, 95, 0.05, 0.05, sorteieCorRGBA(), false));
     carregaShaders();
     num_peixes++;
     directionKey = '';

   }
   else if (directionKey == '-') {
     if(num_peixes != 1) {
      gTris.pop();

      for (let i = 0; i < 3; i++) {
        gPosicoesTris.pop();
        gCoresTris.pop();
      }

      num_peixes--;
      carregaShaders();
      directionKey = '';

     }
   }

   let now = Date.now();
   let delta;

   // jogo parado ou não
   if (jogo_estate) 
     delta = (now - gUltimoT) / 1000;
   else delta = 0;

    gUltimoT = now;
    gl.clear(gl.COLOR_BUFFER_BIT);
    desenheTris(delta, projection);

    window.requestAnimationFrame(desenhe);

 }

 function desenheTris(delta, projection) {
  // atualiza e desenha quads
  gl.bindVertexArray(gShader.trisVAO);
  for (let i = 0; i < gTris.length; i++) {
    let obj = gTris[i];
    atualize(obj, delta, i);

    // Calcula a matriz modelView
    var modelView = translate(obj.pos[0], obj.pos[1], 0);
    modelView = mult(modelView, rotateZ(obj.theta));  // esta linha rotaciona o bgl
    modelView = mult(modelView, scale(obj.sx, obj.sy, 1));

    // combina projection e modelveiw
    var uMatrix = mult(projection, modelView);

    // carrega na GPU
    gl.uniformMatrix4fv(gShader.uMatrix, false, flatten(uMatrix));

    // desenhe
    gl.drawArrays(gl.TRIANGLES, 3 * i, 3);
  }
}

 // ========================================================
 // Código fonte dos shaders em GLSL
 // a primeira linha deve conter "#version 300 es"
 // para WebGL 2.0
 
 gVertexShaderSrc = `#version 300 es
 
 // aPosition é um buffer de entrada
 in vec2 aPosition;
 uniform mat4 uMatrix;
 
 in vec4 aColor;  // buffer com a cor de cada vértice
 out vec4 vColor; // varying -> passado ao fShader
 
 void main() {
     gl_Position = vec4( uMatrix * vec4(aPosition,0,1) );
     vColor = aColor; 
 }
 `;
 
 gFragmentShaderSrc = `#version 300 es
 
 // Vc deve definir a precisão do FS.
 // Use highp ("high precision") para desktops e mediump para mobiles.
 precision highp float;
 
 // out define a saída 
 in vec4 vColor;
 out vec4 outColor;
 
 void main() {
   outColor = vColor;
 }
 `;
 
// ========================================================
 /** Classe Triangulo
  * 
  * @param {Number} x - centro x
  * @param {Number} y - centro y
  * @param {Number} vx - vel x 
  * @param {Number} vy - vel y 
  * @param {Number} vrz - vel rotacao em z
  * @param {Number} sx - escala x 
  * @param {Number} sy - escala y 
  * @param {Array} cor - RGBA 
  * @param {Boolean} - solido ou colorido
  */
  function Triangle(x, y, vx, vy, vrz, sx, sy, cor, colorido = true) {
    this.vertices = [  
      vec2(1.0, 0.0),
      vec2(-0.5, 0.5),
      vec2(-0.5, -0.5)
    ];

    this.nv = this.vertices.length;
    this.pos = vec2(x, y);
    this.vel = vec2(vx, vy);
    this.cor = cor;
    this.theta = 0;
    this.vrz = vrz;
    this.sx = sx;
    this.sy = sy;
  
    // inicializa buffers    
    let vt = this.vertices;
    let i, j, k;
    [i, j, k] = [0, 1, 2]
    gPosicoesTris.push(vt[i]);
    gPosicoesTris.push(vt[j]);
    gPosicoesTris.push(vt[k]);

    console.log(gPosicoesTris);
  
    if (colorido) cor = sorteieCorRGBA();
    gCoresTris.push(cor);
    gCoresTris.push(cor);
    gCoresTris.push(cor);
  
  };

 function velEscalar(vx, vy) {
   let angle = Math.atan2(vy,vx);
   let s = vx/Math.cos(angle);
   return s;
 }


 /**
  * atualiza a posição dos vertices de um objeto
  * @param {obj} obj - disco ou quad
  * @param {Number} delta - intervalo de tempo desde a ultima atualização
  */
 function atualize(obj, delta, indice) {
   //obj.pos = add(obj.pos, mult(delta, obj.vel));
   let x, y;
   let vx, vy;
   [x, y] = obj.pos;
   [vx, vy] = obj.vel;
   let s;
   
  // Mudanças nos boids --------------------------
  if(true) { // peixe não lider
    let algn_x = 0, algn_y = 0;
    let sep_x = 0, sep_y = 0;
    let coh_x = 0, coh_y = 0;
    let count = 0;

    if(gTris.length > 1) {
      [algn_x, algn_y, count] = align(gTris, obj, indice);
      algn_x -= vx; algn_y -= vy;
      [sep_x, sep_y] = separate(gTris, obj, indice);
      [coh_x, coh_y] = cohere(gTris, obj, indice);
    }

    vx += coh_x/100 + algn_x/10 + sep_x/25;
    vy += coh_y/100 + algn_y/10 + sep_y/25;
    console.log(vx, vy);
  }
  
   // Controle do peixe ----------------------------
   obj.theta = Math.atan2(vy,vx) * 180/Math.PI;

   if (!jogo_estate)
    console.log("em pausa");

   else if (directionKey != '') {
     switch(directionKey) {
       case 'ArrowUp':
          vy += (0.3)*vy;
          vx += (0.3)*vx;
         break;

       case 'ArrowDown':
         vy -= (0.3)*vy;
         vx -= (0.3)*vx;
         break;

       case 'ArrowLeft': 
        s = velEscalar(vx, vy);
        obj.theta = obj.theta + 20;
        vx = s*Math.cos(obj.theta *Math.PI/180);
        vy = s*Math.sin(obj.theta *Math.PI/180); 
         break;

       case 'ArrowRight':
        s = velEscalar(vx, vy);
        obj.theta = obj.theta - 20; 
        vx = s*Math.cos(obj.theta *Math.PI/180);
        vy = s*Math.sin(obj.theta *Math.PI/180);
         break;

     }

     directionKey = '';

   }

  // Limite de tela ---------------------------------------
  if (x < -1) { x = -1; vx = -vx; obj.vrz *= -1 };
  if (y < -1) { y = -1; vy = -vy; obj.vrz *= -1 };
  if (x >= 1) { x =  1; vx = -vx; obj.vrz *= -1 };
  if (y >= 1) { y =  1; vy = -vy; obj.vrz *= -1 };

  // Limite de velocidade ---------------------------------
/*   if(velEscalar(vx, vy) > 5) {
    vx = 
  } */

   obj.pos = vec2(x, y);
   obj.vel = vec2(vx, vy);
   obj.pos = add(obj.pos, mult(delta, obj.vel));

 };

 /**
  * atualiza a posição dos vertices de um objeto
  * @param {Number} x - posicao x do primeiro corpo
  * @param {Number} y - posicao y do primeiro corpo
  * @param {Number} x_other - posicao x do segundo corpo
  * @param {Number} y_other - posicao y do segundo corpo
  */
 function dist(x, y, x_other, y_other) {
   return Math.sqrt(Math.abs((x-x_other)*(x-x_other) + (y-y_other)*(y-y_other)));
 }

 function separate(gTris, obj, indice) {
   let x, y;
   let x_other, y_other;
   let sum_x = 0;
   let sum_y = 0;
   let distance;

   [x, y] = obj.pos;
   
   for(let i = 0; i < gTris.length; i++) {
    if(i != indice) {

      [x_other, y_other] = gTris[i].pos;
      distance = dist(x, y, x_other, y_other);
      //console.log('dist:', dist);

      if (distance < 0.15) {
        // inversamente proporcional à distancia
        sum_x += ((x - x_other)/distance);
        sum_y += ((y - y_other)/distance); 
      }
    }
  }

  return [sum_x, sum_y];

 }

 function align(gTris, obj, indice) {
   /* calcula vel media de todos peixes */
   let sum_vx = 0;
   let sum_vy = 0;
   let vx, vy;
   let x, y;
   let distance;
   let count = 0;

   for(let i = 0; i < gTris.length; i++) {
     if(i != indice) {

        [x, y] = gTris[i].pos;
        distance = dist(obj.pos[0], obj.pos[1], x, y);

        if(distance < 0.5) {
          [vx, vy] = gTris[i].vel;
          sum_vx += vx;
          sum_vy += vy;
          count++;
        }
     }
   }

   if(count) {
    sum_vx /= count;
    sum_vy /= count;
   }

   return [sum_vx, sum_vy, count];
 }

 function cohere(gTris, obj, indice) {
   let sum_x = 0;
   let sum_y = 0;
   let peso = 0;
   let peso_total = 0;
   let distance;
   let x, y;

   for(let i = 0; i < gTris.length; i++) {
    if(i != indice) {

      [x, y] = gTris[i].pos;
      distance = dist(obj.pos[0], obj.pos[1], x, y);

      if(distance < 100) {
        peso = gTris[i].sx;
        peso_total += peso;
        sum_x += peso*x;
        sum_y += peso*y;
      }

    }
  }

  //sum_x /= gTris.length-1;
  //sum_y /= gTris.length-1;
  if(!peso_total)
    return [0, 0];

  sum_x /= peso_total;
  sum_y /= peso_total;

  [x, y] = obj.pos;

  return [(sum_x-x), (sum_y-y)];

 }
