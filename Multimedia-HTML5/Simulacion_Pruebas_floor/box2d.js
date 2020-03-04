//Declarar objetos utilizados como variables
var b2Vec2 = Box2D.Common.Math.b2Vec2;
var b2BodyDef = Box2D.Dynamics.b2BodyDef; 
var b2Body = Box2D.Dynamics.b2Body;
var b2FixtureDef = Box2D.Dynamics.b2FixtureDef; 
var b2Fixture = Box2D.Dynamics.b2Fixture; 
var b2World = Box2D.Dynamics.b2World;  
var b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape; 
var b2CircleShape = Box2D.Collision.Shapes.b2CircleShape;
var b2DebugDraw = Box2D.Dynamics.b2DebugDraw;
var b2RevoluteJointDef = Box2D.Dynamics.Joints.b2RevoluteJointDef;

var world;
var scale = 30; //30 pixeles en el canvas equivalen a 1 metro en el mundo Box2d
function init(){
	//Configuración del mundo Box2d que realiazará la mayor parte del cálculo de la física.
	var gravity = new b2Vec2(0,9.8); //Declara la gravedad como 9.8 m/s^2. 
	var allowSleep = true; //Permite que los objetos que están en reposo se queden dormidos y se excluyan de los cálculos. 
	
	world = new b2World(gravity,allowSleep);

	createFloor();
    setupDebugDraw();
	animate();
}

function createFloor(){
//Un definición Body que tiene todos los datos necesarios para construir un cuerpo rígido.
var bodyDef = new b2BodyDef;
bodyDef.type = b2Body.b2_staticBody;
bodyDef.position.x = 640/2/scale;
bodyDef.position.y = 450/scale;

// Un accesorio se utiliza para unir una forma a un cuerpo para la detección de colisiones.
// La definición de un accesorio se utiliza para crerar un fixture.
var fixtureDef = new b2FixtureDef;
fixtureDef.density = 1.0;
fixtureDef.friction = 0.5;
fixtureDef.restitution = 0.2;

fixtureDef.shape = new b2PolygonShape;
fixtureDef.shape.SetAsBox(320/scale, 10/scale); //640 pixeles de ancho por 20 pixeles de alto.

var body = world.CreateBody(bodyDef);
var fixture = body.CreateFixture(fixtureDef);
}

var context;
function setupDebugDraw(){
	context = document.getElementById('canvas').getContext('2d');

	var debugDraw = new b2DebugDraw();

	// Utilizar este contexto para dibujar la pantalla de depuración
	debugDraw.SetSprite(context);
	// Fijar la escala 
	debugDraw.SetDrawScale(scale);
	// Rellenar las cajas con transparencia de 0.3
	debugDraw.SetFillAlpha(0.3);
	// Dibujar líneas con espesor de 1
	debugDraw.SetLineThickness(1.0);
	// Mostrar todas las formas y uniones
	debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);	

	// Empezar a utilizar el dibujo de depurtación en el mundo
	world.SetDebugDraw(debugDraw);
}

var timeStep = 1/60;

//La iteración sugerida para Box2D es 8 para velocidad y 3 para posición. 
var velocityIterations = 8;
var positionIterations = 3;

function animate(){
	world.Step(timeStep,velocityIterations,positionIterations);
	world.ClearForces();

	world.DrawDebugData();

	// Dibujo personalizado
	if (specialBody){
		drawSpecialBody();
	}

	//Matar Special Body si muere
	if (specialBody && specialBody.GetUserData().life<=0){
		world.DestroyBody(specialBody);
		specialBody = undefined;
		console.log("The special body was destroyed");
	}

	setTimeout(animate, timeStep);
}



