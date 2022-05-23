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
 
 // Os códigos fonte dos shaders serão descritos em 
 // strings para serem compilados e passados a GPU
 var gVertexShaderSrc;
 var gFragmentShaderSrc;
 
 // Define o objeto a ser desenhado: uma lista de vértices
 // com coordenadas no intervalo (0,0) a (200, 200)
 var gUltimoT = Date.now();
 
 // para usar no VAO
 var gTris = [];

 var gCoresTris = [];
 var gPosicoesTris = [];
 
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
  gTris.push(new Triangle(0.5, 0.5, 0.5, 0.5, 95, 0.2, 0.2, sorteieCorRGBA(), false));

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

  switch (keyName) {
      case 'ArrowRight': 
          console.log('Move para a direita.');
          break;

      case 'ArrowLeft':
          console.log('Move para a esquerda.');
          break;

      case 'ArrowDown':
          console.log('Move para baixo.');
          break;

      case 'ArrowUp':
        console.log('Move para cima.');
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
 
   // carrega dados dos quads
   var bufPosTris = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, bufPosTris);
   gl.bufferData(gl.ARRAY_BUFFER, flatten(gPosicoesTris), gl.STATIC_DRAW);
 
   // Associa as variáveis do shader ao buffer gPosicoes
   var aPosTris = gl.getAttribLocation(gShader.program, "aPosition");
   gl.vertexAttribPointer(aPosTris, 2, gl.FLOAT, false, 0, 0);
   gl.enableVertexAttribArray(aPosTris);

   // buffer de cores
   var colorBufTris = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, colorBufTris);
   gl.bufferData(gl.ARRAY_BUFFER, flatten(gCoresTris), gl.STATIC_DRAW);
   var aColorTris = gl.getAttribLocation(gShader.program, "aColor");
   gl.vertexAttribPointer(aColorTris, 4, gl.FLOAT, false, 0, 0);
   gl.enableVertexAttribArray(aColorTris);
 
   // resolve os uniforms
   gShader.uMatrix = gl.getUniformLocation(gShader.program, "uMatrix");
   gl.bindVertexArray(null); // apenas boa prática
 
 };
 
 /**
  * Usa o shader para desenhar.
  * Assume que os dados já foram carregados e são estáticos.
  */
 function desenhe() {
   // atualiza o relógio
   let now = Date.now();
   let delta = (now - gUltimoT) / 1000;
   gUltimoT = now;
 
   // limpa o canvas
   gl.clear(gl.COLOR_BUFFER_BIT);
 
   // cria a matriz de projeção - pode ser feita uma única vez
   let w = gCanvas.width;
   let h = gCanvas.height;
  //  let projection = mat4(
  //    2 / w, 0, 0, -1,
  //    0, -2 / h, 0, 1,
  //    0, 0, 1, 0,
  //    0, 0, 0, 1
  //  );
  let projection = mat4(
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  );
 
   desenheTris(delta, projection);
   window.requestAnimationFrame(desenhe);
 
 }

 function desenheTris(delta, projection) {
  // atualiza e desenha quads
  gl.bindVertexArray(gShader.trisVAO);
  for (let i = 0; i < gTris.length; i++) {
    let obj = gTris[i];
    atualize(obj, delta);

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
    this.vertices = [  // quadrado de lado 1
      vec2(0.5, 0.0),
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
  
    if (colorido) cor = sorteieCorRGBA();
    gCoresTris.push(cor);
    gCoresTris.push(cor);
    gCoresTris.push(cor);

  
  };


 /**
  * atualiza a posição dos vertices de um objeto
  * @param {obj} obj - disco ou quad
  * @param {Number} delta - intervalo de tempo desde a ultima atualização
  */
 function atualize(obj, delta) {
   obj.pos = add(obj.pos, mult(delta, obj.vel));
   let x, y;
   let vx, vy;
   [x, y] = obj.pos;
   [vx, vy] = obj.vel;
   //obj.theta = (obj.theta + obj.vrz * delta) % (360);
   obj.theta = Math.atan2(vx,vy) * 180/Math.PI;
   //console.log("Rot: ", obj.theta);
 
  //  // bateu? Altere o trecho abaixo para considerar o raio!
  //  if (x < 0) { x = -x; vx = -vx; obj.vrz *= -1 };
  //  if (y < 0) { y = -y; vy = -vy; obj.vrz *= -1 };
  //  if (x >= gCanvas.width) { x = gCanvas.width; vx = -vx; obj.vrz *= -1 };
  //  if (y >= gCanvas.height) { y = gCanvas.height; vy = -vy; obj.vrz *= -1 };

   if (x < -1) { x = -1; vx = -vx; obj.vrz *= -1 };
   if (y < -1) { y = -1; vy = -vy; obj.vrz *= -1 };
   if (x >= 1) { x = 1; vx = -vx; obj.vrz *= -1 };
   if (y >= 1) { y = 1; vy = -vy; obj.vrz *= -1 };
 
 
   obj.pos = vec2(x, y);
   obj.vel = vec2(vx, vy);
 };
 