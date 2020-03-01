// Declarar todos los objetos de uso común como variables por conveniencia
var b2Vec2 = Box2D.Common.Math.b2Vec2;
var b2BodyDef = Box2D.Dynamics.b2BodyDef;
var b2Body = Box2D.Dynamics.b2Body;
var b2FixtureDef = Box2D.Dynamics.b2FixtureDef;
var b2Fixture = Box2D.Dynamics.b2Fixture;
var b2World = Box2D.Dynamics.b2World;
var b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
var b2CircleShape = Box2D.Collision.Shapes.b2CircleShape;
var b2DebugDraw = Box2D.Dynamics.b2DebugDraw;

// Solicitud de requestAnimationFrame y cancelAnimationFrame para su uso en el código del juego
(function() {
	var lastTime = 0;
	var vendors = ['ms', 'moz', 'webkit', 'o'];
	for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
		window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
		window.cancelAnimationFrame = 
		  window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
	}
 
	if (!window.requestAnimationFrame)
		window.requestAnimationFrame = function(callback, element) {
			var currTime = new Date().getTime();
			var timeToCall = Math.max(0, 16 - (currTime - lastTime));
			var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
			  timeToCall);
			lastTime = currTime + timeToCall;
			return id;
		};
 
	if (!window.cancelAnimationFrame)
		window.cancelAnimationFrame = function(id) {
			clearTimeout(id);
		};
}());

$(window).load(function() {
	game.init();
});

var game = {
	// Inicialización de objetos, precarga de elementos y pantalla de inicio
	init: function(){
		// Inicialización de objetos   
		levels.init();
		loader.init();
		mouse.init();

		// Cargar todos los efectos de sonido y música de fondo
	
		//"Kindergarten" by Gurdonark
		//http://ccmixter.org/files/gurdonark/26491 is licensed under a Creative Commons license
		game.backgroundMusic = loader.loadSound('assets/audio/dances_with_koalas');

		game.slingshotReleasedSound = loader.loadSound("assets/audio/released");
		game.bounceSound = loader.loadSound('assets/audio/bounce');
		game.breakSound = {
			"fire-pannel":loader.loadSound('assets/audio/glassbreak'),
			"dirt-pannel":loader.loadSound('assets/audio/woodbreak')
		};


		// Ocultar todas las capas del juego y mostrar la pantalla de inicio
		$('.gamelayer').hide();
		$('#gamestartscreen').show();

		//Obtener el controlador para el lienzo de juego y el contexto
		game.canvas = document.getElementById('gamecanvas');
		game.context = game.canvas.getContext('2d');
	},	  
	startBackgroundMusic:function(){
		var toggleImage = $("#togglemusic")[0];	
		game.backgroundMusic.play();
		toggleImage.src="assets/images/icons/sound.png";	
	},
	stopBackgroundMusic:function(){
		var toggleImage = $("#togglemusic")[0];	
		toggleImage.src="assets/images/icons/nosound.png";	
		game.backgroundMusic.pause();
		game.backgroundMusic.currentTime = 0; // Ir al comienzo de la canción
	},
	toggleBackgroundMusic:function(){
		var toggleImage = $("#togglemusic")[0];
		if(game.backgroundMusic.paused){
			game.backgroundMusic.play();
			toggleImage.src="assets/images/icons/sound.png";
		} else {
			game.backgroundMusic.pause();	
			$("#togglemusic")[0].src="assets/images/icons/nosound.png";
		}
	},
	showLevelScreen:function(){
		$('.gamelayer').hide();
		$('#levelselectscreen').show('slow');
	},
	restartLevel:function(){
		window.cancelAnimationFrame(game.animationFrame);		
		game.lastUpdateTime = undefined;
		levels.load(game.currentLevel.number);
	},
	startNextLevel:function(){
		window.cancelAnimationFrame(game.animationFrame);		
		game.lastUpdateTime = undefined;
		levels.load(game.currentLevel.number+1);
	},
	// Modo Juego 
	mode:"intro", 
	// Coordenadas X & Y de la honda
	slingshotX:140,
	slingshotY:280,
	start:function(){
		$('.gamelayer').hide();
		// Display the game canvas and score 
		$('#gamecanvas').show();
		$('#scorescreen').show();
	
		game.startBackgroundMusic();
	
		game.mode = "intro";	
		game.offsetLeft = 0;
		game.ended = false;
		game.animationFrame = window.requestAnimationFrame(game.animate,game.canvas);
	},		

	

	// Velocidad máxima de panoramización por fotograma en píxeles
	maxSpeed:3,
	// Mínimo y Máximo desplazamiento panorámico
	minOffset:0,
	maxOffset:300,
	// Desplazamiento de panorámica actual
	offsetLeft:0,
	// La puntuación del juego
	score:0,

	//Despliegue la pantalla para centrarse en newCenter
	panTo:function(newCenter){
		if (Math.abs(newCenter-game.offsetLeft-game.canvas.width/4)>0 
			&& game.offsetLeft <= game.maxOffset && game.offsetLeft >= game.minOffset){
		
			var deltaX = Math.round((newCenter-game.offsetLeft-game.canvas.width/4)/2);
			if (deltaX && Math.abs(deltaX)>game.maxSpeed){
				deltaX = game.maxSpeed*Math.abs(deltaX)/(deltaX);
			}
			game.offsetLeft += deltaX; 
		} else {
			
			return true;
		}
		if (game.offsetLeft <game.minOffset){
			game.offsetLeft = game.minOffset;
			return true;
		} else if (game.offsetLeft > game.maxOffset){
			game.offsetLeft = game.maxOffset;
			return true;
		}		
		return false;
	},
	countHeroesAndVillains:function(){
		game.heroes = [];
		game.villains = [];
		for (var body = box2d.world.GetBodyList(); body; body = body.GetNext()) {
			var entity = body.GetUserData();
			if(entity){
				if(entity.type == "hero"){				
					game.heroes.push(body);			
				} else if (entity.type =="villain"){
					game.villains.push(body);
				}
			}
		}
	},
  	mouseOnCurrentHero:function(){
		if(!game.currentHero){
			return false;
		}
		var position = game.currentHero.GetPosition();
		var distanceSquared = Math.pow(position.x*box2d.scale - mouse.x-game.offsetLeft,2) + Math.pow(position.y*box2d.scale-mouse.y,2);
		var radiusSquared = Math.pow(game.currentHero.GetUserData().radius,2);		
		return (distanceSquared<= radiusSquared);	
	},
	decelerating:0,
	handlePanning:function(){
		   if(game.mode=="intro"){		
			   if(game.panTo(700)){
				   game.mode = "load-next-hero";
			   }			 
		   }	   

		   if (game.mode=="wait-for-firing"){  
			if (mouse.dragging){
				if (game.mouseOnCurrentHero()){
					game.mode = "firing";
				} else {
					game.panTo(mouse.x + game.offsetLeft)
				}
			} else {
				game.panTo(game.slingshotX);
			}
		}

		if (game.mode == "firing"){  
			if(mouse.down){
				game.panTo(game.slingshotX);				
				game.currentHero.SetPosition({x:(mouse.x+game.offsetLeft)/box2d.scale,y:mouse.y/box2d.scale});
			} else {
				game.mode = "fired";
				game.slingshotReleasedSound.play();								
				var impulseScaleFactor = 0.75;
				
				// Coordenadas del centro de la honda (donde la banda está atada a la honda)
				var slingshotCenterX = game.slingshotX + 35;
				var slingshotCenterY = game.slingshotY+25;
				var impulse = new b2Vec2((slingshotCenterX -mouse.x-game.offsetLeft)*impulseScaleFactor,(slingshotCenterY-mouse.y)*impulseScaleFactor);
				game.currentHero.ApplyImpulse(impulse,game.currentHero.GetWorldCenter());

			}
		}

		if (game.mode == "fired"){		
			//Vista panorámica donde el héroe se encuentra actualmente...
			var heroX = game.currentHero.GetPosition().x*box2d.scale;
			game.panTo(heroX);

			//Y esperar hasta que deja de moverse, está fuera de los límites o se mueve lentamente durante demasiado tiempo
			if(game.currentHero.m_linearVelocity.x<2 && game.currentHero.m_xf.position.y>13) {
				game.decelerating++;
			} else {
				game.decelerating = 0;
			}
			if(!game.currentHero.IsAwake() || heroX<0 || heroX >game.currentLevel.foregroundImage.width || game.decelerating>350){
				// Luego borra el viejo héroe
				box2d.world.DestroyBody(game.currentHero);
				game.currentHero = undefined;
				// Resetea el numero de veces que se desplaza lentamente
				game.decelerating = 0;
				// y carga el siguiente héroe
				game.mode = "load-next-hero";
			}
		}
		

		if (game.mode == "load-next-hero"){
			game.countHeroesAndVillains();

			// Comprobar si algún villano está vivo, si no, termine el nivel (éxito)
			if (game.villains.length == 0){
				game.mode = "level-success";
				return;
			}

			// Comprobar si hay más héroes para cargar, si no terminar el nivel (fallo)
			if (game.heroes.length == 0){
				game.mode = "level-failure"	
				return;		
			}

			// Cargar el héroe y establecer el modo de espera para disparar (wait-for-firing)
			if(!game.currentHero){
				game.currentHero = game.heroes[game.heroes.length-1];
				game.currentHero.SetPosition({x:180/box2d.scale,y:200/box2d.scale});
	 			game.currentHero.SetLinearVelocity({x:0,y:0});
	 			game.currentHero.SetAngularVelocity(0);
				game.currentHero.SetAwake(true);				
			} else {
				// Esperar a que el héroe deje de rebotar y se duerma y luego cambie a espera para disparar (wait-for-firing)
				game.panTo(game.slingshotX);
				if(!game.currentHero.IsAwake()){
					game.mode = "wait-for-firing";
				}
			}
		   }	
   
			if(game.mode=="level-success" || game.mode=="level-failure"){		
				if(game.panTo(0)){
					game.ended = true;					
					game.showEndingScreen();
				}			 
			}
			

	  	},
		showEndingScreen:function(){
			game.stopBackgroundMusic();				
			if (game.mode=="level-success"){			
				if(game.currentLevel.number<levels.data.length-1){
					$('#endingmessage').html('Level Complete. Well Done!!!');
					$("#playnextlevel").show();
				} else {
					$('#endingmessage').html('All Levels Complete. Well Done!!!');
					$("#playnextlevel").hide();
				}
			} else if (game.mode=="level-failure"){			
				$('#endingmessage').html('Failed. Play Again?');
				$("#playnextlevel").hide();
			}		
	
			$('#endingscreen').show();
		},
	
	animate:function(){
		// Animar el fondo
		game.handlePanning();

		// Animar los personajes
			var currentTime = new Date().getTime();
			var timeStep;
			if (game.lastUpdateTime){
				timeStep = (currentTime - game.lastUpdateTime)/1000;
				if(timeStep >2/60){
					timeStep = 2/60
				}
				box2d.step(timeStep);
			} 
			game.lastUpdateTime = currentTime;
	

		// Dibujar el fondo con desplazamiento de paralaje
		game.context.drawImage(game.currentLevel.backgroundImage,game.offsetLeft/4,0,640,480,0,0,640,480);
		game.context.drawImage(game.currentLevel.foregroundImage,game.offsetLeft,0,640,480,0,0,640,480);

		// Dibujar la honda
		game.context.drawImage(game.slingshotImage,game.slingshotX-game.offsetLeft,game.slingshotY);

		// Dibujar todos los cuerpos
		game.drawAllBodies();
	
		// Dibujar la banda cuando estamos disparando un héroe
		if(game.mode == "wait-for-firing" || game.mode == "firing"){  
			game.drawSlingshotBand();
		}

		// Dibujar el frente de la honda
		game.context.drawImage(game.slingshotFrontImage,game.slingshotX-game.offsetLeft,game.slingshotY);

		if (!game.ended){
			game.animationFrame = window.requestAnimationFrame(game.animate,game.canvas);
		}	
	},
	drawAllBodies:function(){  
		box2d.world.DrawDebugData();	

		// Iterar a través de todos los cuerpos y dibujarlos en el lienzo del juego		  
		for (var body = box2d.world.GetBodyList(); body; body = body.GetNext()) {
			var entity = body.GetUserData();
  
			if(entity){
				var entityX = body.GetPosition().x*box2d.scale;
				if(entityX<0|| entityX>game.currentLevel.foregroundImage.width||(entity.health && entity.health <0)){
					box2d.world.DestroyBody(body);
					if (entity.type=="villain"){
						game.score += entity.calories;
						$('#score').html('Score: '+game.score);
					}
					if (entity.breakSound){
						entity.breakSound.play();
					}
				} else {
					entities.draw(entity,body.GetPosition(),body.GetAngle())				
				}	
			}
		}
	},
	drawSlingshotBand:function(){
		game.context.strokeStyle = "rgb(68,31,11)"; // Color marrón oscuro
		game.context.lineWidth = 6; // Dibuja una línea gruesa

		// Utilizar el ángulo y el radio del héroe para calcular el centro del héroe
		var radius = game.currentHero.GetUserData().radius;
		var heroX = game.currentHero.GetPosition().x*box2d.scale;
		var heroY = game.currentHero.GetPosition().y*box2d.scale;			
		var angle = Math.atan2(game.slingshotY+25-heroY,game.slingshotX+50-heroX);	
	
		var heroFarEdgeX = heroX - radius * Math.cos(angle);
		var heroFarEdgeY = heroY - radius * Math.sin(angle);
	
	
	
		game.context.beginPath();
		// Iniciar la línea desde la parte superior de la honda (la parte trasera)
		game.context.moveTo(game.slingshotX+50-game.offsetLeft, game.slingshotY+25);	

		// Dibuja línea al centro del héroe
		game.context.lineTo(heroX-game.offsetLeft,heroY);
		game.context.stroke();		
	
		// Dibuja el héroe en la banda posterior
		entities.draw(game.currentHero.GetUserData(),game.currentHero.GetPosition(),game.currentHero.GetAngle());
			
		game.context.beginPath();		
		// Mover al borde del héroe más alejado de la parte superior de la honda
		game.context.moveTo(heroFarEdgeX-game.offsetLeft,heroFarEdgeY);
	
		// Dibujar línea de regreso a la parte superior de la honda (el lado frontal)
		game.context.lineTo(game.slingshotX-game.offsetLeft +10,game.slingshotY+30)
		game.context.stroke();
	},

}

var levels = {
	// Datos de nivel
	data:[
	 {   // Primer nivel 
		foreground:'burning-hell-foreground',
		background:'fire-background',
		entities:[
			{type:"ground", name:"dirt", x:500,y:440,width:1000,height:20,isStatic:true},
			{type:"ground", name:"dirt-pannel", x:185,y:390,width:30,height:80,isStatic:true},

			{type:"block", name:"dirt-pannel", x:520,y:380,angle:90,width:100,height:25},
			{type:"block", name:"fire-pannel", x:520,y:280,angle:90,width:100,height:25},								
			{type:"villain", name:"femaleZombie",x:520,y:205,calories:590},

			{type:"block", name:"dirt-pannel", x:620,y:380,angle:90,width:100,height:25},
			{type:"block", name:"fire-pannel", x:620,y:280,angle:90,width:100,height:25},								
			{type:"villain", name:"maleZombie", x:620,y:205,calories:420},				

			{type:"hero", name:"sword",x:80,y:405},
			{type:"hero", name:"axe",x:140,y:405},
		]
	 },
		{   // Segundo nivel
			foreground:'burning-hell-foreground',
			background:'fire-background',
			entities:[
				{type:"ground", name:"dirt", x:500,y:440,width:1000,height:20,isStatic:true},
				{type:"ground", name:"dirt-pannel", x:185,y:390,width:30,height:80,isStatic:true},
	
				{type:"block", name:"dirt-pannel", x:820,y:380,angle:90,width:100,height:25},
				{type:"block", name:"dirt-pannel", x:720,y:380,angle:90,width:100,height:25},
				{type:"block", name:"dirt-pannel", x:620,y:380,angle:90,width:100,height:25},
				{type:"block", name:"fire-pannel", x:670,y:317.5,width:100,height:25},
				{type:"block", name:"fire-pannel", x:770,y:317.5,width:100,height:25},				

				{type:"block", name:"fire-pannel", x:670,y:255,angle:90,width:100,height:25},
				{type:"block", name:"fire-pannel", x:770,y:255,angle:90,width:100,height:25},
				{type:"block", name:"dirt-pannel", x:720,y:192.5,width:100,height:25},	

				{type:"villain", name:"femaleZombie",x:715,y:155,calories:590},
				{type:"villain", name:"maleZombie",x:670,y:405,calories:420},
				{type:"villain", name:"dinnosaur",x:765,y:400,calories:150},

				{type:"hero", name:"shuriken",x:30,y:415},
				{type:"hero", name:"sword",x:80,y:405},
				{type:"hero", name:"axe",x:140,y:405},
			]
		},
		{   // Tercer nivel
			foreground:'burning-hell-foreground',
			background:'fire-background',
			entities:[
				{type:"ground", name:"dirt", x:500,y:440,width:1000,height:20,isStatic:true},
				{type:"ground", name:"dirt-pannel", x:185,y:390,width:30,height:80,isStatic:true},
	
				{type:"block", name:"fire-pannel", x:820,y:380,angle:90,width:100,height:25},
				{type:"block", name:"fire-pannel", x:720,y:380,angle:90,width:100,height:25},
				{type:"block", name:"fire-pannel", x:620,y:380,angle:90,width:100,height:25},
				{type:"block", name:"dirt-pannel", x:670,y:317.5,width:100,height:25},
				{type:"block", name:"dirt-pannel", x:770,y:317.5,width:100,height:25},				

				{type:"block", name:"fire-pannel", x:800,y:255,angle:90,width:100,height:25},
				{type:"block", name:"fire-pannel", x:720,y:255,angle:90,width:100,height:25},
				{type:"block", name:"fire-pannel", x:640,y:255,angle:90,width:100,height:25},
				{type:"block", name:"dirt-pannel", x:670,y:192.5,width:100,height:25},
				{type:"block", name:"dirt-pannel", x:770,y:192.5,width:100,height:25},		

				{type:"villain", name:"femaleZombie",x:715,y:155,calories:590},
				{type:"villain", name:"maleZombie",x:670,y:405,calories:420},
				{type:"villain", name:"dinnosaur",x:765,y:400,calories:150},

				{type:"villain", name:"femaleZombie",x:765,y:270,calories:150},
				{type:"villain", name:"maleZombie",x:680,y:270,calories:150},

				{type:"hero", name:"axe",x:30,y:415},
				{type:"hero", name:"sword",x:80,y:405},
				{type:"hero", name:"shuriken",x:140,y:405},
			]
		},
		{   // Cuarto nivel
			foreground:'burning-hell-foreground',
			background:'fire-background',
			entities:[
				{type:"ground", name:"dirt", x:500,y:440,width:1000,height:20,isStatic:true},
				{type:"ground", name:"dirt-pannel", x:185,y:390,width:30,height:80,isStatic:true},
	
				{type:"block", name:"dirt-pannel", x:820,y:380,angle:90,width:100,height:25},
				{type:"block", name:"dirt-pannel", x:845,y:380,angle:90,width:100,height:25},
				{type:"block", name:"dirt-pannel", x:720,y:380,angle:90,width:100,height:25},
				{type:"block", name:"dirt-pannel", x:620,y:380,angle:90,width:100,height:25},
				{type:"block", name:"dirt-pannel", x:645,y:380,angle:90,width:100,height:25},
				{type:"block", name:"fire-pannel", x:670,y:317.5,width:100,height:25},
				{type:"block", name:"fire-pannel", x:770,y:317.5,width:100,height:25},
				{type:"block", name:"fire-pannel", x:670,y:292.5,width:100,height:25},
				{type:"block", name:"fire-pannel", x:770,y:292.5,width:100,height:25},				

				{type:"villain", name:"maleZombie",x:670,y:405,calories:420},
				{type:"villain", name:"dinnosaur",x:765,y:400,calories:150},

				{type:"villain", name:"femaleZombie",x:765,y:270,calories:150},
				{type:"villain", name:"maleZombie",x:680,y:270,calories:150},

				{type:"hero", name:"axe",x:30,y:415},
				{type:"hero", name:"shuriken",x:80,y:405},
				{type:"hero", name:"sword",x:140,y:405},
			]
		},
		{   // Quinto nivel
			foreground:'burning-hell-foreground',
			background:'fire-background',
			entities:[
				{type:"ground", name:"dirt", x:500,y:440,width:1000,height:20,isStatic:true},
				{type:"ground", name:"dirt-pannel", x:185,y:390,width:30,height:80,isStatic:true},
	
				{type:"block", name:"fire-pannel", x:550,y:380,angle:90,width:100,height:25},
				{type:"block", name:"dirt-pannel", x:820,y:380,angle:90,width:100,height:25},
				{type:"block", name:"dirt-pannel", x:770,y:380,angle:90,width:100,height:25},
				{type:"block", name:"dirt-pannel", x:720,y:380,angle:90,width:100,height:25},
				{type:"block", name:"dirt-pannel", x:670,y:380,angle:90,width:100,height:25},
				{type:"block", name:"dirt-pannel", x:620,y:380,angle:90,width:100,height:25},
				{type:"block", name:"dirt-pannel", x:645,y:380,angle:90,width:100,height:25},
				{type:"block", name:"fire-pannel", x:670,y:317.5,width:100,height:25},
				{type:"block", name:"fire-pannel", x:770,y:317.5,width:100,height:25},				

				{type:"block", name:"fire-pannel", x:670,y:255,angle:90,width:100,height:25},
				{type:"block", name:"fire-pannel", x:770,y:255,angle:90,width:100,height:25},
				{type:"block", name:"dirt-pannel", x:720,y:192.5,width:100,height:25},	

				{type:"villain", name:"femaleZombie",x:715,y:155,calories:590},
				{type:"villain", name:"maleZombie",x:715,y:270,calories:590},
				{type:"villain", name:"dinnosaur",x:860,y:400,calories:150},
				{type:"villain", name:"maleZombie",x:575,y:405,calories:590},

				
				
				{type:"hero", name:"shuriken",x:30,y:415},
				{type:"hero", name:"axe",x:80,y:405},
				{type:"hero", name:"rock",x:140,y:405},
			]
		}
	],

	// Inicializar pantalla de selección de nivel
	init:function(){
		var html = "";
		for (var i=0; i < levels.data.length; i++) {
			var level = levels.data[i];
			html += '<input type="button" value="'+(i+1)+'">';
		};
		$('#levelselectscreen').html(html);
		
		// Establecer los controladores de eventos de clic de botón para cargar el nivel
		$('#levelselectscreen input').click(function(){
			levels.load(this.value-1);
			$('#levelselectscreen').hide();
		});
	},

	   // Cargar todos los datos e imágenes para un nivel específico
	load:function(number){
	   //Inicializar box2d world cada vez que se carga un nivel
		box2d.init();

		// Declarar un nuevo objeto de nivel actual
		game.currentLevel = {number:number,hero:[]};
		game.score=0;
		$('#score').html('Score: '+game.score);
		game.currentHero = undefined;
		var level = levels.data[number];


		//Cargar las imágenes de fondo, primer plano y honda
		game.currentLevel.backgroundImage = loader.loadImage("assets/images/backgrounds/"+level.background+".png");
		game.currentLevel.foregroundImage = loader.loadImage("assets/images/backgrounds/"+level.foreground+".png");
		game.slingshotImage = loader.loadImage("assets/images/slingshot.png");
		game.slingshotFrontImage = loader.loadImage("assets/images/slingshot-front.png");

		// Cargar todas la entidades
		for (var i = level.entities.length - 1; i >= 0; i--){	
			var entity = level.entities[i];
			entities.create(entity);			
		};

		  //Llamar a game.start() una vez que los assets se hayan cargado
	   if(loader.loaded){
		   game.start()
	   } else {
		   loader.onload = game.start;
	   }
	}
}

var entities = {
	definitions:{
		"fire-pannel":{
			fullHealth:100,
			density:2.4,
			friction:0.4,
			restitution:0.15,
		},
		"dirt-pannel":{
			fullHealth:500,
			density:0.7,
			friction:0.4,
			restitution:0.4,
		},
		"dirt":{
			density:3.0,
			friction:1.5,
			restitution:0.2,	
		},
		"femaleZombie":{
			shape:"circle",
			fullHealth:40,
			radius:25,
			density:1,
			friction:0.5,
			restitution:0.4,	
		},
		"dinnosaur":{
			shape:"rectangle",
			fullHealth:80,
			width:40,
			height:60,
			density:1,
			friction:0.5,
			restitution:0.7,	
		},
		"maleZombie":{
			shape:"rectangle",
			fullHealth:50,
			width:40,
			height:50,
			density:1,
			friction:0.5,
			restitution:0.6,	
		},
		"axe":{
			shape:"circle",
			radius:25,
			density:1.5,
			friction:0.5,
			restitution:0.4,	
		},
		"sword":{
			shape:"circle",
			radius:25,
			density:1.5,
			friction:0.5,
			restitution:0.4,	
		},
		"shuriken":{
			shape:"circle",
			radius:15,
			density:2.0,
			friction:0.5,
			restitution:0.4,	
		},
		"rock":{
			shape:"circle",
			radius:30,
			density:1.25,
			friction:0.5,
			restitution:0.4,	
		},
	},
	// Tomar la entidad, crear un cuerpo box2d y añadirlo al mundo
	create:function(entity){
		var definition = entities.definitions[entity.name];	
		if(!definition){
			console.log ("Undefined entity name",entity.name);
			return;
		}	
		switch(entity.type){
			case "block": // Rectángulos simples
				entity.health = definition.fullHealth;
				entity.fullHealth = definition.fullHealth;
				entity.shape = "rectangle";	
				entity.sprite = loader.loadImage("assets/images/entities/"+entity.name+".png");						
				entity.breakSound = game.breakSound[entity.name];
				box2d.createRectangle(entity,definition);				
				break;
			case "ground": // Rectángulos simples
				// No hay necesidad de salud. Estos son indestructibles
				entity.shape = "rectangle";  
				// No hay necesidad de sprites. Éstos no serán dibujados en absoluto 
				box2d.createRectangle(entity,definition);			   
				break;	
			case "hero":	// Círculos simples
			case "villain": // Pueden ser círculos o rectángulos
				entity.health = definition.fullHealth;
				entity.fullHealth = definition.fullHealth;
				entity.sprite = loader.loadImage("assets/images/entities/"+entity.name+".png");
				entity.shape = definition.shape;  
				entity.bounceSound = game.bounceSound;
				if(definition.shape == "circle"){
					entity.radius = definition.radius;
					box2d.createCircle(entity,definition);					
				} else if(definition.shape == "rectangle"){
					entity.width = definition.width;
					entity.height = definition.height;
					box2d.createRectangle(entity,definition);					
				}												 
				break;							
			default:
				console.log("Undefined entity type",entity.type);
				break;
		}		
	},

	// Tomar la entidad, su posición y ángulo y dibujar en el lienzo de juego
	draw:function(entity,position,angle){
		game.context.translate(position.x*box2d.scale-game.offsetLeft,position.y*box2d.scale);
		game.context.rotate(angle);
		switch (entity.type){
			case "block":
				game.context.drawImage(entity.sprite,0,0,entity.sprite.width,entity.sprite.height,
						-entity.width/2-1,-entity.height/2-1,entity.width+2,entity.height+2);	
			break;
			case "villain":
			case "hero": 
				if (entity.shape=="circle"){
					game.context.drawImage(entity.sprite,0,0,entity.sprite.width,entity.sprite.height,
							-entity.radius-1,-entity.radius-1,entity.radius*2+2,entity.radius*2+2);	
				} else if (entity.shape=="rectangle"){
					game.context.drawImage(entity.sprite,0,0,entity.sprite.width,entity.sprite.height,
							-entity.width/2-1,-entity.height/2-1,entity.width+2,entity.height+2);
				}
				break;				
			case "ground":
				// No hacer nada ... Vamos a dibujar objetos como el suelo y la honda por separado
				break;
		}

		game.context.rotate(-angle);
		game.context.translate(-position.x*box2d.scale+game.offsetLeft,-position.y*box2d.scale);
	}

}

var box2d = {
	scale:30,
	init:function(){
		// Configurar el mundo de box2d que hará la mayoría de los cálculos de la física
		var gravity = new b2Vec2(0,9.8); //Declara la gravedad como 9,8 m / s ^ 2 hacia abajo
		var allowSleep = true; //Permita que los objetos que están en reposo se queden dormidos y se excluyan de los cálculos
		box2d.world = new b2World(gravity,allowSleep);

		// Configurar depuración de dibujo
		var debugContext = document.getElementById('debugcanvas').getContext('2d');
		var debugDraw = new b2DebugDraw();
		debugDraw.SetSprite(debugContext);
		debugDraw.SetDrawScale(box2d.scale);
		debugDraw.SetFillAlpha(0.3);
		debugDraw.SetLineThickness(1.0);
		debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);	
		box2d.world.SetDebugDraw(debugDraw);
	
		var listener = new Box2D.Dynamics.b2ContactListener;
		listener.PostSolve = function(contact,impulse){
			var body1 = contact.GetFixtureA().GetBody();
			var body2 = contact.GetFixtureB().GetBody();
			var entity1 = body1.GetUserData();
			var entity2 = body2.GetUserData();

			var impulseAlongNormal = Math.abs(impulse.normalImpulses[0]);
			// Este listener es llamado con mucha frecuencia. Filtra los impulsos muy prqueños.
			// Después de probar diferentes valores, 5 parece funcionar bien
			if(impulseAlongNormal>5){
				// Si los objetos tienen una salud, reduzca la salud por el valor del impulso			
				if (entity1.health){
					entity1.health -= impulseAlongNormal;
				}	

				if (entity2.health){
					entity2.health -= impulseAlongNormal;
				}	
		
				// Si los objetos tienen un sonido de rebote, reproducirlos				
				if (entity1.bounceSound){
					entity1.bounceSound.play();
				}

				if (entity2.bounceSound){
					entity2.bounceSound.play();
				}
			} 
		};
		box2d.world.SetContactListener(listener);
	},  
	step:function(timeStep){
		// velocidad de las iteraciones = 8
		// posición de las iteraciones = 3
		box2d.world.Step(timeStep,8,3);
	},
	createRectangle:function(entity,definition){
			var bodyDef = new b2BodyDef;
			if(entity.isStatic){
				bodyDef.type = b2Body.b2_staticBody;
			} else {
				bodyDef.type = b2Body.b2_dynamicBody;
			}
			
			bodyDef.position.x = entity.x/box2d.scale;
			bodyDef.position.y = entity.y/box2d.scale;
			if (entity.angle) {
				bodyDef.angle = Math.PI*entity.angle/180;
			}
			
			var fixtureDef = new b2FixtureDef;
			fixtureDef.density = definition.density;
			fixtureDef.friction = definition.friction;
			fixtureDef.restitution = definition.restitution;

			fixtureDef.shape = new b2PolygonShape;
			fixtureDef.shape.SetAsBox(entity.width/2/box2d.scale,entity.height/2/box2d.scale);
			
			var body = box2d.world.CreateBody(bodyDef);	
			body.SetUserData(entity);
			
			var fixture = body.CreateFixture(fixtureDef);
			return body;
	},
	
	createCircle:function(entity,definition){
			var bodyDef = new b2BodyDef;
			if(entity.isStatic){
				bodyDef.type = b2Body.b2_staticBody;
			} else {
				bodyDef.type = b2Body.b2_dynamicBody;
			}
			
			bodyDef.position.x = entity.x/box2d.scale;
			bodyDef.position.y = entity.y/box2d.scale;
			
			if (entity.angle) {
				bodyDef.angle = Math.PI*entity.angle/180;
			}			
			var fixtureDef = new b2FixtureDef;
			fixtureDef.density = definition.density;
			fixtureDef.friction = definition.friction;
			fixtureDef.restitution = definition.restitution;

			fixtureDef.shape = new b2CircleShape(entity.radius/box2d.scale);
			
			var body = box2d.world.CreateBody(bodyDef);	
			body.SetUserData(entity);

			var fixture = body.CreateFixture(fixtureDef);
			return body;
	},  
}


var loader = {
	loaded:true,
	loadedCount:0, // Los assets que se han cargado hasta ahora
	totalCount:0, // Número total de assets que deben cargarse
	
	init:function(){
		// Comprobar si hay soporte de sonido
		var mp3Support,oggSupport;
		var audio = document.createElement('audio');
		if (audio.canPlayType) {
	   		// Actualmente canPlayType() devuelve: "", "maybe" o "probably" 
	  		mp3Support = "" != audio.canPlayType('audio/mpeg');
	  		oggSupport = "" != audio.canPlayType('audio/ogg; codecs="vorbis"');
		} else {
			// La etiqueta de audio no es soportada
			mp3Support = false;
			oggSupport = false;	
		}

		// Comprobar para ogg, después mp3, y finalmente fijar soundFileExtn a indefinido
		loader.soundFileExtn = oggSupport?".ogg":mp3Support?".mp3":undefined;		
	},
	
	loadImage:function(url){
		this.totalCount++;
		this.loaded = false;
		$('#loadingscreen').show();
		var image = new Image();
		image.src = url;
		image.onload = loader.itemLoaded;
		return image;
	},
	soundFileExtn:".ogg",
	loadSound:function(url){
		this.totalCount++;
		this.loaded = false;
		$('#loadingscreen').show();
		var audio = new Audio();
		audio.src = url+loader.soundFileExtn;
		audio.addEventListener("canplaythrough", loader.itemLoaded, false);
		return audio;   
	},
	itemLoaded:function(){
		loader.loadedCount++;
		$('#loadingmessage').html('Loaded '+loader.loadedCount+' of '+loader.totalCount);
		if (loader.loadedCount >= loader.totalCount){
			// Loader se ha cargado completamente. . .
			loader.loaded = true;
			// Ocultar la pantalla de carga
			$('#loadingscreen').hide();
			//Y llamar al método loader.onload si existe
			if(loader.onload){
				loader.onload();
				loader.onload = undefined;
			}
		}
	}
}

var mouse = {
	x:0,
	y:0,
	down:false,
	init:function(){
		$('#gamecanvas').mousemove(mouse.mousemovehandler);
		$('#gamecanvas').mousedown(mouse.mousedownhandler);
		$('#gamecanvas').mouseup(mouse.mouseuphandler);
		$('#gamecanvas').mouseout(mouse.mouseuphandler);
	},
	mousemovehandler:function(ev){
		var offset = $('#gamecanvas').offset();
		
		mouse.x = ev.pageX - offset.left;
		mouse.y = ev.pageY - offset.top;
		
		if (mouse.down) {
			mouse.dragging = true;
		}
	},
	mousedownhandler:function(ev){
		mouse.down = true;
		mouse.downX = mouse.x;
		mouse.downY = mouse.y;
		ev.originalEvent.preventDefault();
		
	},
	mouseuphandler:function(ev){
		mouse.down = false;
		mouse.dragging = false;
	}
}

