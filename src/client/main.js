/*jshint browser:true*/

/*global $: false */
/*global TurbulenzEngine: true */
/*global Draw2D: false */
/*global Draw2DSprite: false */
/*global RequestHandler: false */
/*global TextureManager: false */
/*global Camera: false */
/*global VMath: false */

TurbulenzEngine.onload = function onloadFn()
{
  let intervalID;
  const graphicsDevice = TurbulenzEngine.createGraphicsDevice({});
  const mathDevice = TurbulenzEngine.createMathDevice({});
  const draw2D = Draw2D.create({ graphicsDevice });
  const requestHandler = RequestHandler.create({});
  const textureManager = TextureManager.create(graphicsDevice, requestHandler);
  const inputDevice = TurbulenzEngine.createInputDevice({});
  const input = require('./input.js').create(inputDevice, draw2D);
  const draw_list = require('./draw_list.js').create(draw2D);
  const random_seed = require('random-seed');
  const map = require('./map.js');

  const camera = Camera.create(mathDevice);
  const lookAtPosition = mathDevice.v3Build(0.0, 0.0, 0.0);
  const worldUp = mathDevice.v3BuildYAxis();
  const cameraPosition = mathDevice.v3Build(0.0, 0.0, 1.0);
  camera.lookAt(lookAtPosition, worldUp, cameraPosition);
  camera.updateViewMatrix();
  const sound_manager = require('./sound_manager.js').create(camera.matrix);
  sound_manager.loadSound('test');

  let textures = {};
  function loadTexture(texname) {
    let path = texname;
    if (texname.indexOf('.') !== -1) {
      path = 'img/'+ texname;
    }
    const inst = textureManager.getInstance(path);
    if (inst) {
      return inst;
    }
    textures[texname] = textureManager.load(path, false);
    return textureManager.getInstance(path);
  }
  let textures_loading = 0;
  function createSprite(texname, params) {
    const tex_inst = loadTexture(texname);
    params.texture = tex_inst.getTexture();
    const sprite = Draw2DSprite.create(params);
    ++textures_loading;
    tex_inst.subscribeTextureChanged(function () {
      --textures_loading;
      sprite.setTexture(tex_inst.getTexture());
    });
    return sprite;
  }

  // Preload
  loadTexture('test.png');

  // Viewport for Draw2D.
  let game_width = 1280;
  let game_height = 960;
  const color_white = mathDevice.v4Build(1, 1, 1, 1);
  const color_red = mathDevice.v4Build(1, 0, 0, 1);
  const color_yellow = mathDevice.v4Build(1, 1, 0, 1);

  // Cache keyCodes
  const keyCodes = inputDevice.keyCodes;
  const padCodes = input.padCodes;

  let configureParams = {
    scaleMode : 'scale',
    viewportRectangle : mathDevice.v4Build(0, 0, game_width, game_height)
  };

  function htmlPos(x, y) {
    const ymin = 0;
    const ymax = game_height;
    const xmin = 0;
    const xmax = game_width;
    return [100 * (x - xmin) / (xmax - xmin), 100 * (y - ymin) / (ymax - ymin)];
  }

  function notify(x, y, msg) {
    let pos = htmlPos(x, y);
    let child = $('<div class="floater" style="left: ' + pos[0] + '%; top: ' + pos[1] + '%;">' + msg + '</div>');
    $('#dynamic_text').append(child);
    setTimeout(function () {
      child.addClass('fade');
    }, 1);
    setTimeout(function () {
      child.remove();
    }, 5000);
  }

  let global_timer = 0;
  let game_state;


  const TICK_TIME = 10000;
  let tick_countdown;
  let month_index = 1;
  let map_data;
  let port_data;
  let cargo;
  let map_tiles = {};
  let tiles = {};
  let tile_size;
  const HOME_PORT = '19,12';
  function loadGraphics() {
    const spriteSize = 8;
    map_data = map.map();
    tick_countdown = TICK_TIME * 2;
    port_data = {};
    port_data[HOME_PORT] = {
      pop: 1000,
      food: 240,
      money: 200,
      ag: 0,
      harv: 0,
      mine: 1000,
    };
    cargo = {
      max: 100,
      pop: 20,
      food: 0,
      money: 80,
    };
    tile_size = game_height / map_data.length;
    map_tiles.water = createSprite('water.png', {
      width : tile_size,
      height : tile_size,
      rotation : 0,
      textureRectangle : mathDevice.v4Build(0, 0, spriteSize, spriteSize),
      origin: [0,0],
    });
    map_tiles.land = createSprite('land.png', {
      width : tile_size,
      height : tile_size,
      rotation : 0,
      textureRectangle : mathDevice.v4Build(0, 0, spriteSize, spriteSize),
      origin: [0,0],
    });
    map_tiles.land_shadow = createSprite('land_shadow.png', {
      width : tile_size,
      height : tile_size,
      rotation : 0,
      textureRectangle : mathDevice.v4Build(0, 0, spriteSize, spriteSize),
      origin: [-tile_size/6,-tile_size/6],
    });
    map_tiles.port = createSprite('port.png', {
      width : tile_size,
      height : tile_size,
      rotation : 0,
      textureRectangle : mathDevice.v4Build(0, 0, spriteSize, spriteSize),
      origin: [0,0],
    });
    map_tiles.port2 = createSprite('port2.png', {
      width : tile_size,
      height : tile_size,
      rotation : 0,
      textureRectangle : mathDevice.v4Build(0, 0, spriteSize, spriteSize),
      origin: [0,0],
    });
    tiles.ship = createSprite('ship.png', {
      width : tile_size,
      height : tile_size,
      rotation : 0,
      textureRectangle : mathDevice.v4Build(0, 0, spriteSize, spriteSize),
      origin: [tile_size/2,tile_size*0.60],
    });

  }

  function titleInit(dt) {
    $('.screen').hide();
    $('#title').show();
    game_state = title;
    loadGraphics();
    title(dt);
  }

  function title(dt) {
    //test(dt);
    if (textures_loading === 0) {
      game_state = playInit;
    }
  }

  function winInit(dt) {
    $('.screen').hide();
    $('#win').show();
    game_state = win;
    win(dt);
  }

  function win(dt) {
  }

  let hero;

  function playInit(dt) {
    $('.screen').hide();
    $('#play').show();
    game_state = play;
    hero = {
      x: 18,
      y: 11,
    };
    play(dt);
  }


  function doCharacter(dt) {
    const speed = 0.003;
    let dx = 0;
    let dy = 0;
    if (input.isKeyDown(keyCodes.LEFT) || input.isKeyDown(keyCodes.A) || input.isPadButtonDown(0, padCodes.LEFT)) {
      dx = -1;
    } else if (input.isKeyDown(keyCodes.RIGHT) || input.isKeyDown(keyCodes.D) || input.isPadButtonDown(0, padCodes.RIGHT)) {
      dx = 1;
    }
    if (input.isKeyDown(keyCodes.UP) || input.isKeyDown(keyCodes.W) || input.isPadButtonDown(0, padCodes.UP)) {
      dy = -1;
    } else if (input.isKeyDown(keyCodes.DOWN) || input.isKeyDown(keyCodes.S) || input.isPadButtonDown(0, padCodes.DOWN)) {
      dy = 1;
    }
    let lendelta = Math.max(1, Math.sqrt(dx*dx+dy*dy));

    let newx = Math.min(map_data.length - 0.5, Math.max(0.5, hero.x + dx/lendelta * dt * speed));
    let newy = Math.min(map_data[0].length - 0.5, Math.max(0.5, hero.y + dy/lendelta * dt * speed));
    if (map_data[Math.floor(newx)][Math.floor(hero.y)] === 'land') {
      newx = hero.x;
    }
    if (map_data[Math.floor(hero.x)][Math.floor(newy)] === 'land') {
      newy = hero.y;
    }
    hero.x = newx;
    hero.y = newy;
    draw_list.queue(tiles.ship, hero.x*tile_size, hero.y*tile_size, 10, [1,1,1,1]);
    // $('#something').text(Math.floor(hero.x) + ' ' + Math.floor(hero.y));

    let total = cargo.pop + cargo.food + cargo.money;
    $('#status_pop').text(cargo.pop);
    $('#status_food').text(cargo.food);
    $('#status_money').text(cargo.money);
    $('#status_cargo').text(total + '/' + cargo.max);
  }

  const POP_PER_FOOD = 50;
  const POP_PER_AG = 3;
  const COST = {
    harv: 10,
    mine: 10,
  };
  function calcPortProd(pd) {
    let food_produced = Math.min(pd.harv, Math.min(pd.ag, Math.floor(pd.pop / POP_PER_AG)));
    let pop_not_making_food = Math.max(0, pd.pop - food_produced * POP_PER_AG);
    let money_produced = Math.min(pop_not_making_food, pd.mine);
    let food_needed = Math.ceil(pd.pop / POP_PER_FOOD);
    let food_consumed = Math.min(food_needed, pd.food + food_produced);
    let starved = Math.max(0, pd.pop - food_consumed * POP_PER_FOOD);
    let died = starved ? Math.max(1, Math.floor(starved / 2)) : 0;
    let babies = died ? 0 : Math.floor(pd.pop * 0.01);
    return {
      food_produced,
      food_consumed,
      died,
      babies,
      money_produced,
    };
  }

  let port_visible = false;
  let port_has_pop = null;
  let port_has_ag = null;
  let port_was_home = null;
  let in_port_key;
  function doPort() {
    let x = Math.floor(hero.x);
    let y = Math.floor(hero.y);
    let in_port = map_data[x][y] === 'port';
    if (in_port) {
      if (!port_visible) {
        $('#port').fadeIn();
        port_visible = true;
      }
    } else {
      if (port_visible) {
        $('#port').fadeOut();
        port_visible = false;
      }
    }
    if (!in_port) {
      return false;
    }
    in_port_key = x + ',' + y;
    let is_home_port = in_port_key === HOME_PORT;
    let key = in_port_key;
    let pd = port_data[key] = port_data[key] || {
      pop: 0,
      food: 0,
      money: 0,
      ag: 200,
      harv: 0,
      mine: 0,
    };
    if (pd.pop || pd.food || pd.money) {
      if (port_has_pop !== true) {
        port_has_pop = true;
        $('.port-needpop').show();
        $('.not-port-needpop').hide();
      }
      if (pd.ag) {
        if (port_has_ag !== true) {
          port_has_ag = true;
          $('.port-needag').show();
        }
      } else {
        if (port_has_ag !== false) {
          port_has_ag = false;
          $('.port-needag').hide();
        }
      }
    } else {
      if (port_has_pop !== false) {
        port_has_pop = false;
        $('.port-needpop').hide();
        $('.not-port-needpop').show();
      }
      if (port_has_ag !== false) {
        port_has_ag = false;
        $('.port-needag').hide();
      }
    }
    let pp = calcPortProd(pd);
    $('#port_pop').html(pd.pop + '<span class="icon icon-pop"></span>' + (pp.died ? ' (starving: ' + pp.died + '/mo)' : ' (+' + pp.babies + '/mo)'));
    $('#port_food').html(pd.food +  '<span class="icon icon-food"></span> (eat: ' + pp.food_consumed + '/mo)' );
    $('#port_money').html(pd.money + '<span class="icon icon-money"></span> (+' + pp.money_produced + '/mo)');
    $('#port_ag').html(pd.ag ? pd.ag + ' (+' + pp.food_produced + ' <span class="icon icon-food"></span>/mo)' : 'DEPLETED');
    let max_harv = Math.floor(Math.min(pd.pop / POP_PER_AG, pd.ag));
    $('#port_harv').html(pd.ag ? pd.harv + '<span class="icon icon-harv"></span>/' + max_harv + ' (' + (Math.min(pd.harv, pd.ag) * POP_PER_AG) + '<span class="icon icon-pop"></span>)' : '(useless)');
    $('#port_mine').html(pd.mine + '<span class="icon icon-mine"></span>' + (is_home_port ? '' : '/' + Math.max(pd.pop - Math.min(max_harv, pd.harv) * POP_PER_AG, 0)) + ' (' + pd.mine + '<span class="icon icon-pop"></span>)');

    if (is_home_port) {
      if (port_was_home !== true) {
        port_was_home = true;
        $('.home-port').show();
      }
    } else {
      if (port_was_home !== false) {
        port_was_home = false;
        $('.home-port').hide();
      }
    }
    return true;
  }

  $('.porttrans').click(function (ev) {
    let split = ev.target.id.split('-');
    let op = split[0];
    let res = split[1];
    let amt = Number(split[2]) || Infinity;
    let pd = port_data[in_port_key];
    if (op === 'give') {
      amt = Math.min(amt, cargo[res]);
      cargo[res] -= amt;
      pd[res] += amt;
    } else if (op === 'take') {
      let free_space = cargo.max - cargo.food - cargo.pop - cargo.money;
      // if (res === 'money') {
      //   free_space = Infinity;
      // }
      amt = Math.min(amt, pd[res]);
      amt = Math.min(amt, free_space);
      cargo[res] += amt;
      pd[res] -= amt;
    } else if (op === 'build') {
      amt = Math.min(amt, Math.floor((pd.money + cargo.money) / COST[res]));
      let max_harv = Math.floor(Math.min(pd.pop / POP_PER_AG, pd.ag));
      let max_mines = Math.max(pd.pop - Math.min(max_harv, pd.harv) * POP_PER_AG, 0);
      let max = res === 'harv' ? max_harv : max_mines;
      amt = Math.min(amt, max - pd[res]);
      amt = Math.max(amt, 0);
      let cost = amt * COST[res];
      if (cost < pd.money) {
        pd.money -= cost;
      } else {
        cost -= pd.money;
        pd.money = 0;
        cargo.money -= cost;
      }
      pd[res] += amt;
    }
  });

  function drawMap() {
    for (let ii = 0; ii < map_data.length; ++ii) {
      let col = map_data[ii];
      for (let jj = 0; jj < col.length; ++jj) {
        let tile = map_tiles.water;
        let z = 1;
        if (col[jj] === 'land') {
          draw_list.queue(map_tiles.land_shadow, ii*tile_size, jj*tile_size, 2, [1, 1, 1, 0.8]);
          tile = map_tiles.land;
          z = 3;
        }
        draw_list.queue(tile, ii*tile_size, jj*tile_size, z, [1, 1, 1, 1]);
        if (col[jj] === 'port') {
          let pd = port_data[ii + ',' + jj];
          if (pd && !pd.pop && !pd.ag && !pd.food && !pd.money) {
            // completely depleted
          } else if (pd && pd.pop) {
            draw_list.queue(map_tiles.port, ii*tile_size, jj*tile_size, 2, [1, 1, 1, 1]);
          } else {
            draw_list.queue(map_tiles.port2, ii*tile_size, jj*tile_size, 2, [1, 1, 1, 1]);
          }
        }
      }
    }
  }

  function doTick(paused, dt) {
    let tt = month_index === 1 ? 2 * TICK_TIME : TICK_TIME;
    $('#month').html(
      'Month ' + month_index + ', Day ' +
      (Math.floor((tt - tick_countdown) / tt * 30) + 1) + '<br/>' +
      (paused ? '(paused in port)' : '&nbsp;'));
    if (paused) {
      return;
    }
    tick_countdown -= dt;
    if (tick_countdown > 0) {
      return;
    }
    ++month_index;
    tick_countdown = TICK_TIME;
    for (let key in port_data) {
      let lines = [];
      let pd = port_data[key];
      let pp = calcPortProd(pd);
      pd.food += pp.food_produced;
      pd.ag -= pp.food_produced;
      pd.money += pp.money_produced;
      pd.food -= pp.food_consumed;
      pd.pop -= pp.died;
      pd.pop += pp.babies;
      let df = pp.food_produced - pp.food_consumed;
      if (df) {
        lines.push('<span class="' + (df < 0 ? 'meh">-' : 'good">+') + df + '<span class="icon icon-food"></span></span>');
      }
      if (pp.money_produced) {
        lines.push('<span class="money">+' + pp.money_produced + '<span class="icon icon-money"></span></good>');
      }
      if (pp.died) {
        lines.push('<span class="bad">-' + pp.died + '<span class="icon icon-pop"></span> (STARVING)</span>');
      } else if (pp.babies) {
        lines.push('<span class="meh">+' + pp.babies + '<span class="icon icon-pop"></span></span>');
      }
      if (lines.length) {
        let pos = key.split(',').map(function (v) {
          return Number(v);
        });
        notify(pos[0] * tile_size, pos[1] * tile_size,
          lines.join('<br/>'));
      }
      if (pd.money >= 44000) {
        game_state = winInit;
      }
    }
  }

  function play(dt) {
    drawMap();
    doCharacter(dt);
    let paused = doPort();
    doTick(paused, dt);
  }

  function test(dt) {
    if (!test.color_sprite) {
      test.color_sprite = color_white;
      var spriteSize = 64;
      test.sprite = createSprite('test.png', {
        width : spriteSize,
        height : spriteSize,
        x : (Math.random() * (game_width - spriteSize) + (spriteSize * 0.5)),
        y : (Math.random() * (game_height - spriteSize) + (spriteSize * 0.5)),
        rotation : 0,
        color : test.color_sprite,
        textureRectangle : mathDevice.v4Build(0, 0, spriteSize, spriteSize)
      });
      test.game_bg = createSprite('white', {
        width : game_width,
        height : game_height,
        x : 0,
        y : 0,
        rotation : 0,
        color : [0, 0.72, 1, 1],
        origin: [0, 0],
        textureRectangle : mathDevice.v4Build(0, 0, spriteSize, spriteSize)
      });
    }

    // test.sprite.x = (Math.random() * (game_width - spriteSize) + (spriteSize * 0.5));
    // test.sprite.y = (Math.random() * (game_height - spriteSize) + (spriteSize * 0.5));

    var character = {
      dx: 0,
      dy: 0,
    };
    if (input.isKeyDown(keyCodes.LEFT) || input.isKeyDown(keyCodes.A) || input.isPadButtonDown(0, padCodes.LEFT)) {
      character.dx = -1;
    } else if (input.isKeyDown(keyCodes.RIGHT) || input.isKeyDown(keyCodes.D) || input.isPadButtonDown(0, padCodes.RIGHT)) {
      character.dx = 1;
    }
    if (input.isKeyDown(keyCodes.UP) || input.isKeyDown(keyCodes.W) || input.isPadButtonDown(0, padCodes.UP)) {
      character.dy = -1;
    } else if (input.isKeyDown(keyCodes.DOWN) || input.isKeyDown(keyCodes.S) || input.isPadButtonDown(0, padCodes.DOWN)) {
      character.dy = 1;
    }

    test.sprite.x += character.dx * dt * 0.2;
    test.sprite.y += character.dy * dt * 0.2;
    if (input.isMouseDown() && input.isMouseOverSprite(test.sprite)) {
      test.sprite.setColor(color_yellow);
    } else if (input.clickHitSprite(test.sprite)) {
      test.color_sprite = (test.color_sprite === color_red) ? color_white : color_red;
      sound_manager.play('test');
    } else if (input.isMouseOverSprite(test.sprite)) {
      test.color_sprite[3] = 0.5;
    } else {
      test.color_sprite[3] = 1;
    }

    draw_list.queue(test.game_bg, 0, 0, 1, [0, 0.72, 1, 1]);
    draw_list.queue(test.sprite, test.sprite.x, test.sprite.y, 2, test.color_sprite);
  }

  game_state = titleInit;

  var last_tick = Date.now();
  function tick() {
    if (!graphicsDevice.beginFrame()) {
      return;
    }
    var now = Date.now();
    var dt = Math.min(Math.max(now - last_tick, 1), 250);
    last_tick = now;
    global_timer += dt;
    sound_manager.tick();
    input.tick();

    {
      let screen_width = graphicsDevice.width;
      let screen_height = graphicsDevice.height;
      let screen_aspect = screen_width / screen_height;
      let view_aspect = game_width / game_height;
      if (screen_aspect > view_aspect) {
        let viewport_width = game_height * screen_aspect;
        let half_diff = (viewport_width - game_width) / 2;
        configureParams.viewportRectangle = [-half_diff, 0, game_width + half_diff, game_height];
      } else {
        let viewport_height = game_width / screen_aspect;
        let half_diff = (viewport_height - game_height) / 2;
        configureParams.viewportRectangle = [0, -half_diff, game_width, game_height + half_diff];
      }
      draw2D.configure(configureParams);
    }

    if (window.need_repos) {
      --window.need_repos;
      var ul = draw2D.viewportUnmap(0, 0);
      var lr = draw2D.viewportUnmap(game_width-1, game_height-1);
      var viewport = [ul[0], ul[1], lr[0], lr[1]];
      var height = viewport[3] - viewport[1];
      // default font size of 16 when at height of game_height
      var font_size = Math.min(256, Math.max(2, Math.floor(height/800 * 16)));
      $('#gamescreen').css({
        left: viewport[0],
        top: viewport[1],
        width: viewport[2] - viewport[0],
        height: height,
        'font-size': font_size,
      });
      $('#fullscreen').css({
        'font-size': font_size,
      });
    }

    draw2D.setBackBuffer();
    draw2D.clear([0, 0, 0, 1]);

    game_state(dt);

    draw_list.draw();

    graphicsDevice.endFrame();
  }

  intervalID = TurbulenzEngine.setInterval(tick, 1000/60);
};
