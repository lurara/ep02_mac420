/**
 * Exercício Programa 02 - Boids
 * (código base retirado das aulas de MAC0420)
 * A implementação dos obstáculos é totalmente baseada na implementação
 * de discos do código base da aula sobre VAO.
 * 
 * Nome: Lara Ayumi Nagamatsu
 * NUSP: 9910568
 * 
 */

 "use strict";

 // ==================================================================
 // constantes globais
 
 const FUNDO = [0, 1, 1, 1];
 const DISCO_RES = 2;

 // ==================================================================
 // variáveis globais
 var gl;
 var gCanvas;
 var gShader = {};  // encapsula globais do shader
 var num_peixes = 1;
 var directionKey;
 var jogo_estate = true;
 
 // cria a matriz de projeção - pode ser feita uma única vez
 var projection = mat4(
   1, 0, 0, 0,
   0, 1, 0, 0,
   0, 0, 1, 0,
   0, 0, 0, 1
 );

 // Buffers utilizados nos shaders
 var colorBufTris;
 var bufPosTris;
 var colorBufDiscos;
 var bufPosDiscos;

 // Os códigos fonte dos shaders serão descritos em 
 // strings para serem compilados e passados a GPU
 var gVertexShaderSrc;
 var gFragmentShaderSrc;
 
 // Define o objeto a ser desenhado: uma lista de vértices
 // com coordenadas no intervalo (0,0) a (200, 200)
 var gUltimoT = Date.now();
 
 // para usar no VAO
 var gObstaculos = [];
 var gCoresDiscos = [];
 var gPosicoesDiscos = [];

 var gPeixes = [];
 var gCoresPeixes = [];
 var gPosicoesPeixes = [];

 
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
  
  // cria obstáculos
  gObstaculos.push(new Disco(-0.3, 0, 0.3, -45, 0.5, 0.5, sorteieCorRGBA(), true));
  gObstaculos.push(new Disco(0.3, 0.5, 0.2, -45, 0.5, 0.5, sorteieCorRGBA(), true));
  gObstaculos.push(new Disco(0.7, 0.5, 0.1, -45, 0.5, 0.5, sorteieCorRGBA(), true));

  // cria peixe lider
  gPeixes.push(new Peixe(0.5, 0.5, 0.5, 0.5, 95, 0.05, 0.05, [1.00,0.60,0.67,1], false));

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

function insideDisco(obj, o_x, o_y) {
  let [x, y] = obj.pos;

  if(dist(x, y, o_x, o_y) <= obj.raio)
    return true;

  return false;
}
 
function sorteiaPosicao(gPeixes, gObstaculos) {
  // checa se a posicao ja esta preenchidos
  let achou = false;
  let x, y;
  let rx, ry;

  while(!achou) {
    [rx, ry] = [Math.random() * (2.0), Math.random() * (2.0)];
    let pula = false;

    // Checa se na posicao de outro peixe
    for(let i = 0; i < gPeixes.length && !pula; i++) {
      [x, y] = gPeixes[i].pos;
      if(x.toFixed(2) == rx.toFixed(2) && y.toFixed(2) == ry.toFixed(2))
        pula = true;
    }

    // Checa se na posicao de um obstaculo
    for(let i = 0; i < gObstaculos.length && !pula; i++) {
      [x, y] = gObstaculos[i].pos;
      if(insideDisco(gObstaculos[i], rx, ry))
        pula = true;
    }

    if(!pula)
      achou = true;
  }

  return [rx-1, ry-1];
}
 /**
  * cria e configura os shaders
  */
 function crieShaders() {
   //  cria o programa
   gShader.program = makeProgram(gl, gVertexShaderSrc, gFragmentShaderSrc);
   gl.useProgram(gShader.program);

   // Criar VAO para os discos
   gShader.discosVAO = gl.createVertexArray();
   gl.bindVertexArray(gShader.discosVAO);
  
   // carrega dados dos discos - associado ao VAO ativo
   bufPosDiscos = gl.createBuffer();
   colorBufDiscos = gl.createBuffer();

   // carrega dados nos shaders
   carregaShadersDiscos();
 
   // Criar VAO para os peixes
   gShader.trisVAO = gl.createVertexArray();
   gl.bindVertexArray(gShader.trisVAO);
 
   // cria buffer
   bufPosTris = gl.createBuffer();
   colorBufTris = gl.createBuffer();

   // carrega dados nos shaders
   carregaShadersPeixes();

   // resolve os uniforms
   gShader.uMatrix = gl.getUniformLocation(gShader.program, "uMatrix");
   gl.bindVertexArray(null); // apenas boa prática
 
 };

 // SHADERS ************************************************************
 function carregaShadersDiscos() {
  gl.bindBuffer(gl.ARRAY_BUFFER, bufPosDiscos);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(gPosicoesDiscos), gl.STATIC_DRAW);

  // Associa as variáveis do shader ao buffer
  var aPosDiscos = gl.getAttribLocation(gShader.program, "aPosition");
  gl.vertexAttribPointer(aPosDiscos, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPosDiscos);

  // buffer de cores
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBufDiscos);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(gCoresDiscos), gl.STATIC_DRAW);
  var aColorDiscos = gl.getAttribLocation(gShader.program, "aColor");
  gl.vertexAttribPointer(aColorDiscos, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aColorDiscos);
 }

function carregaShadersPeixes() {
  // bind 
  gl.bindBuffer(gl.ARRAY_BUFFER, bufPosTris);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(gPosicoesPeixes), gl.STATIC_DRAW);
  // habilita atributos
  var aPosTris = gl.getAttribLocation(gShader.program, "aPosition");
  gl.vertexAttribPointer(aPosTris, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPosTris);
  //  buffer de cores
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBufTris);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(gCoresPeixes), gl.STATIC_DRAW);
  var aColorTris = gl.getAttribLocation(gShader.program, "aColor");
  gl.vertexAttribPointer(aColorTris, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aColorTris);

}
 
 /**
  * Usa o shader para desenhar.
  * Assume que os dados já foram carregados e são estáticos.
  */
 function desenhe() {

  // Criacao/destruicao de peixes
   if (directionKey == '+') {
     let new_x, new_y;
     [new_x, new_y] = sorteiaPosicao(gPeixes, gObstaculos);
     gPeixes.push(new Peixe(new_x, new_y, 0.5, 0.5, 95, 0.025, 0.025,[0.50,0.58,1.00,1], false));
     carregaShadersPeixes();
     carregaShadersDiscos();
     num_peixes++;
     directionKey = '';
   }
   else if (directionKey == '-') {
     if(num_peixes != 1) {
      gPeixes.pop();

      for (let i = 0; i < 3; i++) {
        gPosicoesPeixes.pop();
        gCoresPeixes.pop();
      }

      num_peixes--;
      carregaShadersPeixes();
      carregaShadersDiscos();
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
    desenhePeixes(delta, projection);
    desenheDiscos(delta, projection);
    window.requestAnimationFrame(desenhe);

 }

 function desenhePeixes(delta, projection) {
  // atualiza e desenha peixes
  gl.bindVertexArray(gShader.trisVAO);
  for (let i = 0; i < gPeixes.length; i++) {
    let obj = gPeixes[i];
    atualize(obj, delta, i);

    // Calcula a matriz modelView
    var modelView = translate(obj.pos[0], obj.pos[1], 0);
    modelView = mult(modelView, rotateZ(obj.theta)); 
    modelView = mult(modelView, scale(obj.sx, obj.sy, 1));

    // combina projection e modelveiw
    var uMatrix = mult(projection, modelView);

    // carrega na GPU
    gl.uniformMatrix4fv(gShader.uMatrix, false, flatten(uMatrix));

    // desenhe
    gl.drawArrays(gl.TRIANGLES, 3 * i, 3);
  }
 }


 function desenheDiscos(delta, projection) {
  // atualiza e desenha discos
  gl.bindVertexArray(gShader.discosVAO);
  for (let i = 0; i < gObstaculos.length; i++) {
    let obj = gObstaculos[i];

    // Calcula a matriz modelView
    var modelView = translate(obj.pos[0], obj.pos[1], 0);
    modelView = mult(modelView, scale(obj.sx * obj.raio, obj.sy * obj.raio, 1));
    // combina projection e modelveiw
    var uMatrix = mult(projection, modelView);
    // carrega na GPU
    gl.uniformMatrix4fv(gShader.uMatrix, false, flatten(uMatrix));
    // desenhe
    gl.drawArrays(gl.TRIANGLES, obj.nv * i * 3, 3 * obj.nv);
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

 /**
 * calcula os vértices de um disco de raio raio centrado em (0,0)
 * @param {Number} ref - numero de vertices
 * @returns - Array de vértices vec2
 */
function aproximeDisco(ref = 4) {
  let raio = 1.0; // raio unitário
  // primeiro um quadrado ao redor da origem
  let vertices = [
    vec2(raio, 0),
    vec2(0, raio),
    vec2(-raio, 0),
    vec2(0, -raio),
  ];

  // refinamento: adiciona 1 vértice em cada lado
  for (let i = 1; i < ref; i++) {
    let novo = [];
    let nv = vertices.length;
    for (let j = 0; j < nv; j++) {
      novo.push(vertices[j]);
      let k = (j + 1) % nv;
      let v0 = vertices[j];
      let v1 = vertices[k];
      let m = mix(v0, v1, 0.5);

      let s = raio / length(m);
      m = mult(s, m)
      novo.push(m);
    }
    vertices = novo;
  }
  return vertices;
}

// ========================================================
/**
 * Classe  Disco/Obstaculo
 * @param {Number} x - centro x
 * @param {Number} y - centro y
 * @param {Number} r - raio
 * @param {Number} vrz - vel rotacao em z
 * @param {Number} sx - escala x 
 * @param {Number} sy - escala y 
 * @param {Array} cor - RGBA 
 * @param {Boolean} - solido ou colorido
 */

function Disco(x, y, r, vrz, sx, sy, cor, colorido = true) {
  this.vertices = aproximeDisco(DISCO_RES);
  this.nv = this.vertices.length;
  this.pos = vec2(x, y);
  this.cor = cor;
  this.raio = r;
  this.theta = 0;
  this.vrz = vrz;
  this.sx = sx;
  this.sy = sy;

  // inicializa buffers    
  let centro = vec2(0, 0) // disco centrado na origem
  let nv = this.nv;
  let vert = this.vertices;
  for (let i = 0; i < nv; i++) {
    let k = (i + 1) % nv;
    gPosicoesDiscos.push(centro);
    gPosicoesDiscos.push(add(centro, vert[i])); // translada 
    gPosicoesDiscos.push(add(centro, vert[k]));

    if (colorido) cor = sorteieCorRGBA();
    gCoresDiscos.push(cor);
    gCoresDiscos.push(cor);
    gCoresDiscos.push(cor);
  }
};

 
// ========================================================
 /** Classe Peixe
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
  function Peixe(x, y, vx, vy, vrz, sx, sy, cor, colorido = true) {
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
    gPosicoesPeixes.push(vt[i]);
    gPosicoesPeixes.push(vt[j]);
    gPosicoesPeixes.push(vt[k]);
  
    if (colorido) cor = sorteieCorRGBA();
    gCoresPeixes.push(cor);
    gCoresPeixes.push(cor);
    gCoresPeixes.push(cor);
  
  };

 /**
  * atualiza a posição dos vertices de um peixe
  * @param {obj} obj - peixe
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
    let algn_x = 0, algn_y = 0;
    let sep_x = 0, sep_y = 0;
    let coh_x = 0, coh_y = 0;
    let obst_x = 0, obst_y = 0;

    if(gPeixes.length > 1) {
      [algn_x, algn_y] = align(gPeixes, obj, indice);
      algn_x -= vx; algn_y -= vy;
      [sep_x, sep_y] = separate(gPeixes, obj, indice);
      [coh_x, coh_y] = cohere(gPeixes, obj, indice);
      [obst_x, obst_y] = evitaObstaculo(obj, gObstaculos);
    }

    vx += coh_x/10 + algn_x/10 + sep_x/25 + obst_x/10;
    vy += coh_y/10 + algn_y/10 + sep_y/25 + obst_y/10;

   // Controle do peixe ----------------------------
   obj.theta = Math.atan2(vy,vx) * 180/Math.PI;

   if ( jogo_estate && directionKey != '') {
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
    if(Math.abs(velEscalar(vx, vy)) >  0.75) { 
      vx = vx/100;
      vy = vy/100;
    }

   obj.pos = vec2(x, y);
   obj.vel = vec2(vx, vy);
   obj.pos = add(obj.pos, mult(delta, obj.vel));

 };

 // Funcao auxiliar que define distancia
 function dist(x, y, x_other, y_other) {
   return Math.sqrt(Math.abs((x-x_other)*(x-x_other) + (y-y_other)*(y-y_other)));
 }

 // Funcao auxiliar
 function emDirecao(obj, atual_x, atual_y, angle) {
   let [x, y] = obj.pos;
   return Math.abs((Math.atan2((atual_y-y), (atual_x-x)) - obj.theta)*Math.PI/180) < angle;
 }

 // Funcao auxiliar
 function velEscalar(vx, vy) {
    let angle = Math.atan2(vy,vx);
    let s = vx/Math.cos(angle);
    return s;
 }

 // Funcao para evitar obstaculos
 function evitaObstaculo(obj, gObstaculos) {
   // se tem obstaculo literalmente na frente de nosso amigo peixe
   let x, y;
   let vx, vy;
   let sum_x = 0;
   let sum_y = 0;
   [x, y] = obj.pos;
   [vx, vy] = obj.vel;
   let atual_x, atual_y;

   for(let i = 0; i < gObstaculos.length; i++) {
     [atual_x, atual_y] = gObstaculos[i].pos;

     // se aproximadamente em direcao ao obstaculo e proximo...
     let distance = dist(x, y, atual_x, atual_y);
     if( ( distance < (gObstaculos[i].raio))
     &&  (emDirecao(obj, atual_x, atual_y, 5))) {
       sum_x += ((x - atual_x)/distance);
       sum_y += ((y - atual_y)/distance); 
     }
   }
   
   return [sum_x, sum_y];
 }

 // Função de separação
 function separate(gPeixes, obj, indice) {
   let x, y;
   let x_other, y_other;
   let sum_x = 0;
   let sum_y = 0;
   let distance;

   [x, y] = obj.pos;
   
   for(let i = 0; i < gPeixes.length; i++) {
    if(i != indice) {

      [x_other, y_other] = gPeixes[i].pos;
      distance = dist(x, y, x_other, y_other);

      if (distance < 0.15) {
        // inversamente proporcional à distancia
        sum_x += ((x - x_other)/distance);
        sum_y += ((y - y_other)/distance); 
      }
    }
  }

  return [sum_x, sum_y];

 }

 // Função de alinhamento
 function align(gPeixes, obj, indice) {
   /* calcula vel media de todos peixes */
   let sum_vx = 0;
   let sum_vy = 0;
   let vx, vy;
   let x, y;
   let distance;
   let count = 0;

   for(let i = 0; i < gPeixes.length; i++) {
     if(i != indice) {

        [x, y] = gPeixes[i].pos;
        distance = dist(obj.pos[0], obj.pos[1], x, y);

        if(distance < 0.5) {
          [vx, vy] = gPeixes[i].vel;
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

   return [sum_vx, sum_vy];
 }

 // Função de coesão
 function cohere(gPeixes, obj, indice) {
   let sum_x = 0;
   let sum_y = 0;
   let peso = 0;
   let peso_total = 0;
   let distance;
   let x, y;

   for(let i = 0; i < gPeixes.length; i++) {
    if(i != indice) {
      [x, y] = gPeixes[i].pos;
      distance = dist(obj.pos[0], obj.pos[1], x, y);

      if(distance < 100) {
        peso = gPeixes[i].sx;
        peso_total += peso;
        sum_x += peso*x;
        sum_y += peso*y;
      }
    }
  }

  if(!peso_total)
    return [0, 0];

  sum_x /= peso_total;
  sum_y /= peso_total;

  [x, y] = obj.pos;

  return [(sum_x-x), (sum_y-y)];

 }
