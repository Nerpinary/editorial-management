const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../client/dist')));

// Инициализация базы данных
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Ошибка подключения к базе данных:', err.message);
  } else {
    console.log('Подключено к SQLite базе данных');
    initDatabase();
  }
});

// Создание таблиц
function initDatabase() {
  // Таблица редакций
  db.run(`
    CREATE TABLE IF NOT EXISTS editorial_departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      monthly_articles INTEGER DEFAULT 0,
      complexity TEXT DEFAULT 'M' CHECK (complexity IN ('S', 'M', 'L')),
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Таблица сотрудников
  db.run(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      category TEXT NOT NULL CHECK (category IN ('СМВ', 'МВ', 'ММВ')),
      capacity REAL DEFAULT 1.0,
      preferred_departments TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Таблица ролей (грейды)
  db.run(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      capacity REAL DEFAULT 1.0,
      badge_color_bg TEXT DEFAULT 'bg-gray-100',
      badge_color_text TEXT DEFAULT 'text-gray-800',
      description TEXT,
      actions TEXT DEFAULT '["self_check"]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Таблица правил скоринга
  db.run(`
    CREATE TABLE IF NOT EXISTS scoring_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action_type TEXT NOT NULL CHECK (action_type IN ('typeset', 'check', 'self_check')),
      complexity TEXT NOT NULL CHECK (complexity IN ('S', 'M', 'L')),
      score REAL NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(action_type, complexity)
    )
  `);

  // Таблица распределения (связь многие ко многим)
  db.run(`
    CREATE TABLE IF NOT EXISTS employee_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER,
      department_id INTEGER,
      workload_percentage REAL DEFAULT 0.0,
      action_type TEXT DEFAULT 'self_check' CHECK (action_type IN ('typeset', 'check', 'self_check')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE,
      FOREIGN KEY (department_id) REFERENCES editorial_departments (id) ON DELETE CASCADE,
      UNIQUE(employee_id, department_id)
    )
  `);

  // Миграция: добавляем поле action_type если его нет
  db.run(`
    ALTER TABLE employee_assignments ADD COLUMN action_type TEXT DEFAULT 'self_check' CHECK (action_type IN ('typeset', 'check', 'self_check'))
  `, (err) => {
    // Игнорируем ошибку если колонка уже существует
  });

  // Миграция: добавляем поле actions в roles если его нет
  db.run(`
    ALTER TABLE roles ADD COLUMN actions TEXT DEFAULT '["self_check"]'
  `, (err) => {
    // Игнорируем ошибку если колонка уже существует
  });

  // Миграция: добавляем поле complexity если его нет
  db.run(`
    ALTER TABLE editorial_departments ADD COLUMN complexity TEXT DEFAULT 'M' CHECK (complexity IN ('S', 'M', 'L'))
  `, (err) => {
    // Игнорируем ошибку если колонка уже существует
  });

  // Миграция: округляем все значения скоринга до 2 знаков после запятой
  db.all('SELECT id, score FROM scoring_rules', (err, rows) => {
    if (!err && rows) {
      rows.forEach(row => {
        const roundedScore = Math.round(parseFloat(row.score) * 100) / 100;
        if (Math.abs(parseFloat(row.score) - roundedScore) > 0.001) {
          db.run('UPDATE scoring_rules SET score = ? WHERE id = ?', [roundedScore, row.id]);
        }
      });
    }
  });

  // Заполняем начальными данными из вашей таблицы
  insertInitialData();
}

function insertInitialData() {
  // Вставляем начальные роли с действиями
  const roles = [
    { 
      name: 'СМВ', 
      capacity: 0.8, 
      badge_color_bg: 'bg-purple-100', 
      badge_color_text: 'text-purple-800', 
      description: 'Старший менеджер выпуска',
      actions: JSON.stringify(['typeset', 'check', 'self_check'])
    },
    { 
      name: 'МВ', 
      capacity: 1.0, 
      badge_color_bg: 'bg-blue-100', 
      badge_color_text: 'text-blue-800', 
      description: 'Менеджер выпуска',
      actions: JSON.stringify(['typeset', 'self_check'])
    },
    { 
      name: 'ММВ', 
      capacity: 1.3, 
      badge_color_bg: 'bg-green-100', 
      badge_color_text: 'text-green-800', 
      description: 'Младший менеджер выпуска',
      actions: JSON.stringify(['typeset'])
    }
  ];

  roles.forEach(role => {
    // Проверяем, существует ли роль
    db.get('SELECT id, actions FROM roles WHERE name = ?', [role.name], (err, existing) => {
      if (err) {
        console.error('Ошибка проверки роли:', err);
        return;
      }
      
      if (!existing) {
        // Создаем новую роль
        db.run(
          'INSERT INTO roles (name, capacity, badge_color_bg, badge_color_text, description, actions) VALUES (?, ?, ?, ?, ?, ?)',
          [role.name, role.capacity, role.badge_color_bg, role.badge_color_text, role.description, role.actions]
        );
      } else if (!existing.actions) {
        // Обновляем существующую роль, если нет actions
        db.run(
          'UPDATE roles SET actions = ? WHERE id = ?',
          [role.actions, existing.id]
        );
      }
    });
  });

  // Вставляем начальные правила скоринга
  // Базовые значения для M (middle complexity)
  const baseScores = {
    'typeset': 0.8,      // Верстка M статьи = 0.8 очка
    'check': 0.2,        // Проверка M статьи = 0.2 очка
    'self_check': 1.0    // Самопроверка M статьи = 1.0 очка
  };

  const complexityCoefficients = { 'S': 0.5, 'M': 1.0, 'L': 1.5 };

  Object.keys(baseScores).forEach(actionType => {
    Object.keys(complexityCoefficients).forEach(complexity => {
      // Округляем до 2 знаков после запятой для избежания проблем с точностью float
      const score = Math.round((baseScores[actionType] * complexityCoefficients[complexity]) * 100) / 100;
      const descriptions = {
        'typeset': 'Верстка',
        'check': 'Проверка',
        'self_check': 'Самопроверка'
      };
      const complexityLabels = {
        'S': 'Простая',
        'M': 'Средняя',
        'L': 'Сложная'
      };
      const description = `${descriptions[actionType]} ${complexityLabels[complexity]} статьи`;
      
      db.run(
        'INSERT OR IGNORE INTO scoring_rules (action_type, complexity, score, description) VALUES (?, ?, ?, ?)',
        [actionType, complexity, score, description]
      );
    });
  });

  const departments = [
    // S - Простые редакции (50% сложности)
    { name: 'Шорты', monthly_articles: 50, complexity: 'S' },
    { name: 'UGC', monthly_articles: 80, complexity: 'S' },
    { name: 'Новости', monthly_articles: 176, complexity: 'S' },
    { name: 'Списки', monthly_articles: 25, complexity: 'S' },
    { name: 'Тесты', monthly_articles: 15, complexity: 'S' },
    { name: 'Сравнятор', monthly_articles: 10, complexity: 'S' },
    { name: 'Статистика', monthly_articles: 8, complexity: 'S' },
    { name: 'Кто помогает', monthly_articles: 3, complexity: 'S' },
    
    // M - Средние редакции (100% сложности)
    { name: 'Бизнес', monthly_articles: 11, complexity: 'M' },
    { name: 'Вещи', monthly_articles: 86, complexity: 'M' },
    { name: 'Гайды', monthly_articles: 15, complexity: 'M' },
    { name: 'Город', monthly_articles: 8, complexity: 'M' },
    { name: 'Дети', monthly_articles: 12, complexity: 'M' },
    { name: 'Едакция', monthly_articles: 25, complexity: 'M' },
    { name: 'Животные', monthly_articles: 18, complexity: 'M' },
    { name: 'Интернет', monthly_articles: 22, complexity: 'M' },
    { name: 'Интервью', monthly_articles: 5, complexity: 'M' },
    { name: 'Недвижимость', monthly_articles: 15, complexity: 'M' },
    { name: 'Образование', monthly_articles: 20, complexity: 'M' },
    { name: 'Поп-культура', monthly_articles: 30, complexity: 'M' },
    { name: 'Право', monthly_articles: 12, complexity: 'M' },
    { name: 'Спорт', monthly_articles: 18, complexity: 'M' },
    { name: 'Техника', monthly_articles: 45, complexity: 'M' },
    { name: 'Чемодан', monthly_articles: 12, complexity: 'M' },
    { name: 'ЧД', monthly_articles: 20, complexity: 'M' },
    { name: 'ЧД-микро', monthly_articles: 15, complexity: 'M' },
    { name: 'Тюнинг', monthly_articles: 25, complexity: 'M' },
    { name: 'Подкасты и Видео', monthly_articles: 40, complexity: 'M' },
    { name: 'Дневники трат', monthly_articles: 15, complexity: 'M' },
    { name: 'Вакансии', monthly_articles: 20, complexity: 'M' },
    { name: 'Фичеры', monthly_articles: 35, complexity: 'M' },
    
    // L - Сложные редакции (150% сложности)
    { name: 'Медицина', monthly_articles: 35, complexity: 'L' },
    { name: 'Мозг', monthly_articles: 28, complexity: 'L' },
    { name: 'Вложения', monthly_articles: 0, complexity: 'L' }
  ];

  departments.forEach(dept => {
    db.run(
      'INSERT OR IGNORE INTO editorial_departments (name, monthly_articles, complexity) VALUES (?, ?, ?)',
      [dept.name, dept.monthly_articles, dept.complexity]
    );
  });

  // Добавляем реальных сотрудников с предпочтительными редакциями
  const employees = [
    // СМВ - Старшие менеджеры выпуска
    { name: 'Цицеронова', email: 'tsitseronova@example.com', category: 'СМВ', capacity: 0.8, preferred_departments: JSON.stringify(['Бизнес', 'Медицина', 'Образование']) },
    { name: 'Томас', email: 'tomas@example.com', category: 'СМВ', capacity: 0.8, preferred_departments: JSON.stringify(['Техника', 'Интернет', 'Фичеры']) },
    { name: 'Попова', email: 'popova@example.com', category: 'СМВ', capacity: 0.8, preferred_departments: JSON.stringify(['Поп-культура', 'Списки', 'Тесты']) },
    { name: 'Афонина', email: 'afonina@example.com', category: 'СМВ', capacity: 0.8, preferred_departments: JSON.stringify(['Дети', 'Животные', 'Чемодан']) },
    { name: 'Гелета', email: 'geleta@example.com', category: 'СМВ', capacity: 0.8, preferred_departments: JSON.stringify(['Спорт', 'Мозг', 'Статистика']) },
    { name: 'Недашковская', email: 'nedashkovskaya@example.com', category: 'СМВ', capacity: 0.8, preferred_departments: JSON.stringify(['Недвижимость', 'Вложения', 'Право']) },
    { name: 'Панфилова', email: 'panfilova@example.com', category: 'СМВ', capacity: 0.8, preferred_departments: JSON.stringify(['Гайды', 'Вещи', 'Сравнятор']) },
    { name: 'Шалыгин', email: 'shalygin@example.com', category: 'СМВ', capacity: 0.8, preferred_departments: JSON.stringify(['Новости', 'UGC', 'Тюнинг']) },
    { name: 'Шарахматова', email: 'sharahmatova@example.com', category: 'СМВ', capacity: 0.8, preferred_departments: JSON.stringify(['Подкасты и Видео', 'Дневники трат', 'Вакансии']) },
    { name: 'Гуртовая', email: 'gurtovaya@example.com', category: 'СМВ', capacity: 0.8, preferred_departments: JSON.stringify(['Интервью', 'Кто помогает', 'ЧД']) },
    { name: 'Томберг', email: 'tomberg@example.com', category: 'СМВ', capacity: 0.8, preferred_departments: JSON.stringify(['Город', 'Едакция', 'ЧД-микро']) },
    { name: 'Гоцманова', email: 'gotsmanova@example.com', category: 'СМВ', capacity: 0.8, preferred_departments: JSON.stringify(['Шорты', 'Фичеры']) },
    { name: 'Павлов', email: 'pavlov@example.com', category: 'СМВ', capacity: 0.8, preferred_departments: JSON.stringify(['Бизнес', 'Медицина', 'Техника']) },
    { name: 'Тимофеева', email: 'timofeeva@example.com', category: 'СМВ', capacity: 0.8, preferred_departments: JSON.stringify(['Образование', 'Право', 'Поп-культура']) },
    { name: 'Переседова', email: 'peresedova@example.com', category: 'СМВ', capacity: 0.8, preferred_departments: JSON.stringify(['Дети', 'Животные', 'Спорт']) },
    { name: 'Легостаева', email: 'legostaeva@example.com', category: 'СМВ', capacity: 0.8, preferred_departments: JSON.stringify(['Недвижимость', 'Вложения', 'Статистика']) },

    // МВ - Менеджеры выпуска
    { name: 'Боткина', email: 'botkina@example.com', category: 'МВ', capacity: 1.0, preferred_departments: JSON.stringify(['Новости', 'UGC', 'Спорт']) },
    { name: 'Черкасова', email: 'cherkasova@example.com', category: 'МВ', capacity: 1.0, preferred_departments: JSON.stringify(['Бизнес', 'Медицина', 'Техника']) },
    { name: 'Дейкина', email: 'deykina@example.com', category: 'МВ', capacity: 1.0, preferred_departments: JSON.stringify(['Гайды', 'Списки', 'Тесты']) },
    { name: 'Зовутин', email: 'zovutin@example.com', category: 'МВ', capacity: 1.0, preferred_departments: JSON.stringify(['Интернет', 'Техника', 'Фичеры']) },
    { name: 'Иванова Наташа', email: 'ivanova_n@example.com', category: 'МВ', capacity: 1.0, preferred_departments: JSON.stringify(['Дети', 'Животные', 'Чемодан']) },
    { name: 'Рубин', email: 'rubin@example.com', category: 'МВ', capacity: 1.0, preferred_departments: JSON.stringify(['Образование', 'Право', 'Поп-культура']) },
    { name: 'Хохлов', email: 'khozlov@example.com', category: 'МВ', capacity: 1.0, preferred_departments: JSON.stringify(['Недвижимость', 'Вложения', 'Статистика']) },
    { name: 'Корепанов', email: 'korepanov@example.com', category: 'МВ', capacity: 1.0, preferred_departments: JSON.stringify(['Подкасты и Видео', 'Тюнинг', 'Вакансии']) },
    { name: 'Моисеев', email: 'moiseev@example.com', category: 'МВ', capacity: 1.0, preferred_departments: JSON.stringify(['Мозг', 'Сравнятор', 'Шорты']) },

    // ММВ - Младшие менеджеры выпуска
    { name: 'Козлов', email: 'kozlov@example.com', category: 'ММВ', capacity: 1.3, preferred_departments: JSON.stringify(['Гайды', 'Списки', 'Тесты']) },
    { name: 'Смолянко', email: 'smolyanko@example.com', category: 'ММВ', capacity: 1.3, preferred_departments: JSON.stringify(['Дети', 'Животные', 'Чемодан']) },
    { name: 'Черный', email: 'chernyy@example.com', category: 'ММВ', capacity: 1.3, preferred_departments: JSON.stringify(['Спорт', 'Мозг', 'Статистика']) },
    { name: 'Иванова Алина', email: 'ivanova_a@example.com', category: 'ММВ', capacity: 1.3, preferred_departments: JSON.stringify(['Недвижимость', 'Вложения', 'Право']) },
    { name: 'Никитин', email: 'nikitin@example.com', category: 'ММВ', capacity: 1.3, preferred_departments: JSON.stringify(['Интернет', 'Техника', 'Фичеры']) },
    { name: 'Домашенков', email: 'domashenkov@example.com', category: 'ММВ', capacity: 1.3, preferred_departments: JSON.stringify(['Подкасты и Видео', 'Дневники трат', 'Вакансии']) },
    { name: 'Брежнева', email: 'brezhneva@example.com', category: 'ММВ', capacity: 1.3, preferred_departments: JSON.stringify(['Новости', 'UGC', 'Тюнинг']) }
  ];

  employees.forEach(emp => {
    db.run(
      'INSERT OR IGNORE INTO employees (name, email, category, capacity, preferred_departments) VALUES (?, ?, ?, ?, ?)',
      [emp.name, emp.email, emp.category, emp.capacity, emp.preferred_departments]
    );
  });
}

// API Routes

// Редакции
app.get('/api/departments', (req, res) => {
  db.all('SELECT * FROM editorial_departments ORDER BY name', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/departments', (req, res) => {
  const { name, monthly_articles, complexity, description } = req.body;
  db.run(
    'INSERT INTO editorial_departments (name, monthly_articles, complexity, description) VALUES (?, ?, ?, ?)',
    [name, monthly_articles, complexity || 'M', description],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, name, monthly_articles, complexity: complexity || 'M', description });
    }
  );
});

app.put('/api/departments/:id', (req, res) => {
  const { id } = req.params;
  const { name, monthly_articles, complexity, description } = req.body;
  db.run(
    'UPDATE editorial_departments SET name = ?, monthly_articles = ?, complexity = ?, description = ? WHERE id = ?',
    [name, monthly_articles, complexity || 'M', description, id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id, name, monthly_articles, complexity: complexity || 'M', description });
    }
  );
});

app.delete('/api/departments/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM editorial_departments WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ success: true });
  });
});

// Сотрудники
app.get('/api/employees', (req, res) => {
  db.all('SELECT * FROM employees ORDER BY name', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    // Парсим JSON для предпочтительных редакций
    const employees = rows.map(row => ({
      ...row,
      preferred_departments: row.preferred_departments ? JSON.parse(row.preferred_departments) : []
    }));
    res.json(employees);
  });
});

app.post('/api/employees', (req, res) => {
  const { name, email, category, capacity, preferred_departments } = req.body;
  const preferred_departments_json = preferred_departments ? JSON.stringify(preferred_departments) : null;
  db.run(
    'INSERT INTO employees (name, email, category, capacity, preferred_departments) VALUES (?, ?, ?, ?, ?)',
    [name, email, category, capacity, preferred_departments_json],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ 
        id: this.lastID, 
        name, 
        email, 
        category, 
        capacity, 
        preferred_departments: preferred_departments || [] 
      });
    }
  );
});

app.put('/api/employees/:id', (req, res) => {
  const { id } = req.params;
  const { name, email, category, capacity, preferred_departments } = req.body;
  const preferred_departments_json = preferred_departments ? JSON.stringify(preferred_departments) : null;
  db.run(
    'UPDATE employees SET name = ?, email = ?, category = ?, capacity = ?, preferred_departments = ? WHERE id = ?',
    [name, email, category, capacity, preferred_departments_json, id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ 
        id, 
        name, 
        email, 
        category, 
        capacity, 
        preferred_departments: preferred_departments || [] 
      });
    }
  );
});

app.delete('/api/employees/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM employees WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ success: true });
  });
});

// Правила скоринга
app.get('/api/scoring-rules', (req, res) => {
  db.all('SELECT * FROM scoring_rules ORDER BY action_type, complexity', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/scoring-rules/:actionType/:complexity', (req, res) => {
  const { actionType, complexity } = req.params;
  db.get(
    'SELECT * FROM scoring_rules WHERE action_type = ? AND complexity = ?',
    [actionType, complexity],
    (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (!row) {
        res.status(404).json({ error: 'Правило скоринга не найдено' });
        return;
      }
      res.json(row);
    }
  );
});

app.put('/api/scoring-rules/:id', (req, res) => {
  const { id } = req.params;
  let { score, description } = req.body;
  
  if (score === undefined) {
    res.status(400).json({ error: 'Скоринг обязателен' });
    return;
  }
  
  // Округляем до 2 знаков после запятой для избежания проблем с точностью float
  score = Math.round(parseFloat(score) * 100) / 100;
  
  db.run(
    'UPDATE scoring_rules SET score = ?, description = ? WHERE id = ?',
    [score, description, id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Правило скоринга не найдено' });
        return;
      }
      res.json({ success: true });
    }
  );
});

// Получить скоринг для конкретного действия и сложности
function getScoring(actionType, complexity) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT score FROM scoring_rules WHERE action_type = ? AND complexity = ?',
      [actionType, complexity],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row ? row.score : 0);
      }
    );
  });
}

// Роли
app.get('/api/roles', (req, res) => {
  db.all('SELECT * FROM roles ORDER BY name', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    // Парсим JSON для actions
    const roles = rows.map(row => ({
      ...row,
      actions: row.actions ? JSON.parse(row.actions) : ['self_check']
    }));
    res.json(roles);
  });
});

app.get('/api/roles/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM roles WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Роль не найдена' });
      return;
    }
    res.json(row);
  });
});

app.post('/api/roles', (req, res) => {
  const { name, capacity, badge_color_bg, badge_color_text, description, actions } = req.body;
  
  if (!name || capacity === undefined) {
    res.status(400).json({ error: 'Название и емкость обязательны' });
    return;
  }
  
  const actionsJson = actions ? JSON.stringify(actions) : JSON.stringify(['self_check']);
  
  db.run(
    'INSERT INTO roles (name, capacity, badge_color_bg, badge_color_text, description, actions) VALUES (?, ?, ?, ?, ?, ?)',
    [name, capacity, badge_color_bg || 'bg-gray-100', badge_color_text || 'text-gray-800', description, actionsJson],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint')) {
          res.status(400).json({ error: 'Роль с таким названием уже существует' });
        } else {
          res.status(500).json({ error: err.message });
        }
        return;
      }
      res.json({ 
        id: this.lastID, 
        name, 
        capacity, 
        badge_color_bg: badge_color_bg || 'bg-gray-100',
        badge_color_text: badge_color_text || 'text-gray-800',
        description,
        actions: actions || ['self_check']
      });
    }
  );
});

app.put('/api/roles/:id', (req, res) => {
  const { id } = req.params;
  const { name, capacity, badge_color_bg, badge_color_text, description, actions } = req.body;
  
  if (!name || capacity === undefined) {
    res.status(400).json({ error: 'Название и емкость обязательны' });
    return;
  }
  
  const actionsJson = actions ? JSON.stringify(actions) : JSON.stringify(['self_check']);
  
  db.run(
    'UPDATE roles SET name = ?, capacity = ?, badge_color_bg = ?, badge_color_text = ?, description = ?, actions = ? WHERE id = ?',
    [name, capacity, badge_color_bg || 'bg-gray-100', badge_color_text || 'text-gray-800', description, actionsJson, id],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint')) {
          res.status(400).json({ error: 'Роль с таким названием уже существует' });
        } else {
          res.status(500).json({ error: err.message });
        }
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Роль не найдена' });
        return;
      }
      res.json({ 
        id: parseInt(id), 
        name, 
        capacity, 
        badge_color_bg: badge_color_bg || 'bg-gray-100',
        badge_color_text: badge_color_text || 'text-gray-800',
        description,
        actions: actions || ['self_check']
      });
    }
  );
});

app.delete('/api/roles/:id', (req, res) => {
  const { id } = req.params;
  
  // Проверяем, используется ли роль в сотрудниках
  db.get('SELECT COUNT(*) as count FROM employees WHERE category = (SELECT name FROM roles WHERE id = ?)', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (row.count > 0) {
      res.status(400).json({ error: 'Нельзя удалить роль, которая используется в сотрудниках' });
      return;
    }
    
    db.run('DELETE FROM roles WHERE id = ?', [id], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Роль не найдена' });
        return;
      }
      res.json({ success: true });
    });
  });
});

// Распределения
app.get('/api/assignments', (req, res) => {
  const query = `
    SELECT 
      ea.*,
      e.name as employee_name,
      e.category as employee_category,
      e.capacity as employee_capacity,
      ed.name as department_name,
      ed.monthly_articles,
      ed.complexity as department_complexity
    FROM employee_assignments ea
    JOIN employees e ON ea.employee_id = e.id
    JOIN editorial_departments ed ON ea.department_id = ed.id
    ORDER BY e.name, ed.name
  `;
  
  db.all(query, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/assignments', (req, res) => {
  const { employee_id, department_id, action_type } = req.body;
  
  // Получаем информацию о редакции
  db.get('SELECT monthly_articles FROM editorial_departments WHERE id = ?', [department_id], (err, department) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!department) {
      res.status(404).json({ error: 'Редакция не найдена' });
      return;
    }
    
    // Получаем информацию о новом сотруднике и его роли
    db.get(`
      SELECT e.category, e.capacity, r.actions 
      FROM employees e 
      LEFT JOIN roles r ON r.name = e.category 
      WHERE e.id = ?
    `, [employee_id], (err, newEmployee) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      if (!newEmployee) {
        res.status(404).json({ error: 'Сотрудник не найден' });
        return;
      }
      
      // Проверяем доступные действия для роли
      const availableActions = newEmployee.actions ? JSON.parse(newEmployee.actions) : ['self_check'];
      const selectedAction = action_type || availableActions[0];
      
      if (!availableActions.includes(selectedAction)) {
        res.status(400).json({ 
          error: `Роль ${newEmployee.category} не поддерживает действие ${selectedAction}. Доступные действия: ${availableActions.join(', ')}` 
        });
        return;
      }
      
      // Проверяем, не назначен ли уже этот сотрудник в эту редакцию
      db.get('SELECT id FROM employee_assignments WHERE employee_id = ? AND department_id = ?', [employee_id, department_id], (err, existing) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        if (existing) {
          res.status(400).json({ error: 'Сотрудник уже назначен в эту редакцию' });
          return;
        }
        
        // Добавляем новое назначение с временным процентом и action_type
        db.run(
          'INSERT INTO employee_assignments (employee_id, department_id, workload_percentage, action_type) VALUES (?, ?, ?, ?)',
          [employee_id, department_id, 100, selectedAction], // Временный процент
          function(err) {
            if (err) {
              res.status(500).json({ error: err.message });
              return;
            }
            
            // Автоматически перераспределяем нагрузку в редакции
            redistributeDepartmentWorkload(department_id)
              .then(() => {
                res.json({ 
                  success: true, 
                  message: 'Сотрудник добавлен, нагрузка автоматически перераспределена'
                });
              })
              .catch(err => {
                res.status(500).json({ error: err.message });
              });
          }
        );
      });
      });
    });
});

app.put('/api/assignments/:id', (req, res) => {
  const { id } = req.params;
  const { action_type } = req.body;
  
  if (!action_type) {
    res.status(400).json({ error: 'action_type обязателен' });
    return;
  }
  
  // Получаем информацию о назначении и сотруднике
  db.get(`
    SELECT ea.*, e.category, r.actions 
    FROM employee_assignments ea
    JOIN employees e ON ea.employee_id = e.id
    LEFT JOIN roles r ON r.name = e.category
    WHERE ea.id = ?
  `, [id], (err, assignment) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!assignment) {
      res.status(404).json({ error: 'Назначение не найдено' });
      return;
    }
    
    // Проверяем доступные действия для роли
    const availableActions = assignment.actions ? JSON.parse(assignment.actions) : ['self_check'];
    
    if (!availableActions.includes(action_type)) {
      res.status(400).json({ 
        error: `Роль ${assignment.category} не поддерживает действие ${action_type}. Доступные действия: ${availableActions.join(', ')}` 
      });
      return;
    }
    
    // Обновляем action_type
    db.run(
      'UPDATE employee_assignments SET action_type = ? WHERE id = ?',
      [action_type, id],
      function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        res.json({ 
          success: true, 
          message: 'Тип действия обновлен'
        });
      }
    );
  });
});

app.delete('/api/assignments/:id', (req, res) => {
  const { id } = req.params;
  
  // Сначала получаем информацию об удаляемом назначении
  db.get('SELECT employee_id, department_id FROM employee_assignments WHERE id = ?', [id], (err, assignment) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!assignment) {
      res.status(404).json({ error: 'Назначение не найдено' });
      return;
    }
    
    const { department_id } = assignment;
    
    // Удаляем назначение
    db.run('DELETE FROM employee_assignments WHERE id = ?', [id], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      // Автоматически перераспределяем нагрузку в редакции
      redistributeDepartmentWorkload(department_id)
        .then(() => {
          res.json({ 
            success: true, 
            message: 'Назначение удалено, нагрузка автоматически перераспределена'
          });
        })
        .catch(err => {
          res.status(500).json({ error: err.message });
        });
    });
  });
});

// Валидация назначений
app.get('/api/validation/:departmentId', (req, res) => {
  const { departmentId } = req.params;
  
  const query = `
    SELECT 
      e.id,
      e.name,
      e.category,
      e.capacity,
      ea.workload_percentage
    FROM employees e
    LEFT JOIN employee_assignments ea ON e.id = ea.employee_id AND ea.department_id = ?
    WHERE ea.id IS NOT NULL
  `;
  
  db.all(query, [departmentId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Проверяем логику грейдов
    const mmvCount = rows.filter(r => r.category === 'ММВ').length;
    const smvCount = rows.filter(r => r.category === 'СМВ').length;
    
    const validation = {
      isValid: true,
      warnings: [],
      errors: []
    };
    
    // ММВ требует проверки СМВ
    if (mmvCount > 0 && smvCount === 0) {
      validation.isValid = false;
      validation.errors.push(`Редакция с ММВ требует назначения минимум одного СМВ для проверки`);
    }
    
    // Предупреждение если много ММВ на одного СМВ
    if (mmvCount > smvCount * 2) {
      validation.warnings.push(`Много ММВ (${mmvCount}) на СМВ (${smvCount}). Рекомендуется соотношение 1 СМВ на 1-2 ММВ`);
    }
    
    res.json(validation);
  });
});

// Детальная информация по сотрудникам в редакции
app.get('/api/department-details/:departmentId', (req, res) => {
  const { departmentId } = req.params;
  
  const query = `
    SELECT 
      ea.id as assignment_id,
      e.id as employee_id,
      e.name as employee_name,
      e.category,
      e.capacity,
      ea.workload_percentage,
      ea.action_type,
      ed.monthly_articles,
      ed.complexity,
      ROUND((ea.workload_percentage / 100.0) * ed.monthly_articles) as articles_assigned
    FROM employee_assignments ea
    JOIN employees e ON ea.employee_id = e.id
    JOIN editorial_departments ed ON ea.department_id = ed.id
    WHERE ea.department_id = ?
    ORDER BY e.category, e.name
  `;
  
  db.all(query, [departmentId], async (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Добавляем детальную разбивку по типам работы
    const departmentTotal = rows.length > 0 ? rows[0].monthly_articles : 0;
    const departmentComplexity = rows.length > 0 ? rows[0].complexity : 'M';
    
    // Группируем по action_type для расчета проверки
    const typesetAssignments = rows.filter(row => row.action_type === 'typeset');
    const checkAssignments = rows.filter(row => row.action_type === 'check');
    
    // Рассчитываем общее количество статей для проверки (верстают ММВ и те, кто выбрал typeset)
    const totalTypesetArticles = typesetAssignments.reduce((sum, emp) => {
      return sum + emp.articles_assigned;
    }, 0);
    
    // Рассчитываем количество проверяющих для распределения проверки
    const checkCount = checkAssignments.length;
    
    // Получаем скоринги для всех типов действий
    const typesetScore = await getScoring('typeset', departmentComplexity);
    const checkScore = await getScoring('check', departmentComplexity);
    const selfCheckScore = await getScoring('self_check', departmentComplexity);
    
    const detailsWithBreakdown = rows.map(row => {
      let breakdown = {};
      let scoring = {};
      
      // Используем action_type из назначения вместо определения по категории
      const actionType = row.action_type || 'self_check';
      
      if (actionType === 'typeset') {
        breakdown.typeset = row.articles_assigned;
        breakdown.self_check = 0;
        breakdown.check_mmv = 0;
        
        scoring.typeset = breakdown.typeset * typesetScore;
        scoring.check_mmv = 0;
        scoring.self_check = 0;
        scoring.total = scoring.typeset;
      } else if (actionType === 'check') {
        // Проверяющие проверяют часть статей тех, кто верстает
        breakdown.check_mmv = checkCount > 0 ? Math.round(totalTypesetArticles / checkCount) : 0;
        breakdown.self_check = 0;
        breakdown.typeset = 0;
        
        scoring.check_mmv = breakdown.check_mmv * checkScore;
        scoring.self_check = 0;
        scoring.typeset = 0;
        scoring.total = scoring.check_mmv;
      } else if (actionType === 'self_check') {
        breakdown.self_check = row.articles_assigned;
        breakdown.typeset = 0;
        breakdown.check_mmv = 0;
        
        scoring.self_check = breakdown.self_check * selfCheckScore;
        scoring.check_mmv = 0;
        scoring.typeset = 0;
        scoring.total = scoring.self_check;
      }
      
      return {
        ...row,
        breakdown,
        scoring: {
          ...scoring,
          typeset_score: typesetScore,
          check_score: checkScore,
          self_check_score: selfCheckScore
        }
      };
    });
    
    res.json(detailsWithBreakdown);
  });
});

// Вспомогательная функция для автоматического перераспределения нагрузки в редакции
function redistributeDepartmentWorkload(departmentId) {
  return new Promise((resolve, reject) => {
    // Получаем информацию о редакции и всех назначенных сотрудниках
    const query = `
      SELECT 
        ed.monthly_articles,
        ed.complexity,
        e.id as employee_id,
        e.name as employee_name,
        e.category,
        e.capacity,
        ea.id as assignment_id,
        ea.workload_percentage
      FROM editorial_departments ed
      JOIN employee_assignments ea ON ed.id = ea.department_id
      JOIN employees e ON ea.employee_id = e.id
      WHERE ed.id = ?
    `;
    
    db.all(query, [departmentId], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (rows.length === 0) {
        resolve([]);
        return;
      }
      
      // Получаем коэффициент сложности редакции
      const complexityCoefficients = { 'S': 0.5, 'M': 1.0, 'L': 1.5 };
      const complexity = rows[0]?.complexity || 'M';
      const complexityCoeff = complexityCoefficients[complexity] || 1.0;
      
      // Рассчитываем новые проценты нагрузки на основе capacity и сложности
      const totalCapacity = rows.reduce((sum, row) => sum + row.capacity, 0);
      
      const updatePromises = rows.map(row => {
        // Новый процент = (capacity сотрудника / общая capacity) * 100%
        // Учитываем сложность редакции в расчете
        const newPercentage = Math.round((row.capacity / totalCapacity) * 100);
        
        return new Promise((resolveUpdate, rejectUpdate) => {
          db.run(
            'UPDATE employee_assignments SET workload_percentage = ? WHERE id = ?',
            [newPercentage, row.assignment_id],
            function(err) {
              if (err) rejectUpdate(err);
              else resolveUpdate({ 
                employee_id: row.employee_id, 
                employee_name: row.employee_name,
                category: row.category,
                old_percentage: row.workload_percentage,
                new_percentage: newPercentage
              });
            }
          );
        });
      });
      
      Promise.all(updatePromises)
        .then(results => resolve(results))
        .catch(err => reject(err));
    });
  });
}

// Умное перераспределение нагрузки в редакции
app.post('/api/redistribute-workload/:departmentId', (req, res) => {
  const { departmentId } = req.params;
  
  // Получаем информацию о редакции и всех назначенных сотрудниках
  const query = `
    SELECT 
      ed.monthly_articles,
      e.id as employee_id,
      e.name as employee_name,
      e.category,
      e.capacity,
      ea.id as assignment_id,
      ea.workload_percentage
    FROM editorial_departments ed
    JOIN employee_assignments ea ON ed.id = ea.department_id
    JOIN employees e ON ea.employee_id = e.id
    WHERE ed.id = ?
  `;
  
  db.all(query, [departmentId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (rows.length === 0) {
      res.status(404).json({ error: 'Редакция не найдена или нет назначенных сотрудников' });
      return;
    }
    
    const departmentArticles = rows[0].monthly_articles;
    
    // Рассчитываем новые проценты нагрузки на основе capacity
    const totalCapacity = rows.reduce((sum, row) => sum + row.capacity, 0);
    
    const updatePromises = rows.map(row => {
      // Новый процент = (capacity сотрудника / общая capacity) * 100%
      const newPercentage = Math.round((row.capacity / totalCapacity) * 100);
      
      return new Promise((resolve, reject) => {
        db.run(
          'UPDATE employee_assignments SET workload_percentage = ? WHERE id = ?',
          [newPercentage, row.assignment_id],
          function(err) {
            if (err) reject(err);
            else resolve({ 
              employee_id: row.employee_id, 
              employee_name: row.employee_name,
              category: row.category,
              old_percentage: row.workload_percentage,
              new_percentage: newPercentage,
              articles_assigned: Math.round((newPercentage / 100.0) * departmentArticles)
            });
          }
        );
      });
    });
    
    Promise.all(updatePromises)
      .then(results => {
        res.json({ 
          success: true,
          department_id: departmentId,
          monthly_articles: departmentArticles,
          total_coverage: 100, // Всегда 100% после перераспределения
          redistributions: results
        });
      })
      .catch(err => {
        res.status(500).json({ error: err.message });
      });
  });
});

// Получение нормы нагрузки сотрудников
app.get('/api/workload-norms', (req, res) => {
  // Получаем общий план по статьям
  const totalArticlesQuery = 'SELECT SUM(monthly_articles) as total_articles FROM editorial_departments';
  
  // Получаем общую capacity всех сотрудников
  const totalCapacityQuery = 'SELECT SUM(capacity) as total_capacity FROM employees';
  
  Promise.all([
    new Promise((resolve, reject) => {
      db.get(totalArticlesQuery, (err, result) => {
        if (err) reject(err);
        else resolve(result?.total_articles || 0);
      });
    }),
    new Promise((resolve, reject) => {
      db.get(totalCapacityQuery, (err, result) => {
        if (err) reject(err);
        else resolve(result?.total_capacity || 0);
      });
    })
  ])
  .then(([totalArticles, totalCapacity]) => {
    // Норма нагрузки на 100% capacity = Общий план / Общая capacity
    const normPer100Capacity = totalCapacity > 0 ? totalArticles / totalCapacity : 0;
    
    res.json({
      total_articles: totalArticles,
      total_capacity: totalCapacity,
      norm_per_100_capacity: Math.round(normPer100Capacity * 100) / 100,
      norm_per_employee: Math.round(normPer100Capacity)
    });
  })
  .catch(err => {
    res.status(500).json({ error: err.message });
  });
});

// Получить общий скоринг сотрудника
app.get('/api/employee-scoring/:employeeId', (req, res) => {
  const { employeeId } = req.params;
  
  const query = `
    SELECT 
      ea.id as assignment_id,
      ea.workload_percentage,
      ed.monthly_articles,
      ed.complexity,
      e.category,
      ROUND((ea.workload_percentage / 100.0) * ed.monthly_articles) as articles_assigned
    FROM employee_assignments ea
    JOIN employees e ON ea.employee_id = e.id
    JOIN editorial_departments ed ON ea.department_id = ed.id
    WHERE ea.employee_id = ?
  `;
  
  db.all(query, [employeeId], async (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    let totalScoring = 0;
    const scoringByDepartment = [];
    
    // Группируем назначения по редакциям для расчета проверки ММВ
    const departmentsMap = new Map();
    rows.forEach(row => {
      if (!departmentsMap.has(row.assignment_id)) {
        departmentsMap.set(row.assignment_id, {
          ...row,
          employees: []
        });
      }
    });
    
    // Получаем department_id для каждого назначения
    for (const row of rows) {
      const deptIdQuery = 'SELECT department_id FROM employee_assignments WHERE id = ?';
      const deptResult = await new Promise((resolve, reject) => {
        db.get(deptIdQuery, [row.assignment_id], (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
      
      if (!deptResult) continue;
      
      const departmentQuery = `
        SELECT 
          e.id,
          e.category,
          ROUND((ea.workload_percentage / 100.0) * ed.monthly_articles) as articles_assigned
        FROM employee_assignments ea
        JOIN employees e ON ea.employee_id = e.id
        JOIN editorial_departments ed ON ea.department_id = ed.id
        WHERE ed.id = ?
      `;
      
      const deptEmployees = await new Promise((resolve, reject) => {
        db.all(departmentQuery, [deptResult.department_id], (err, empRows) => {
          if (err) reject(err);
          else resolve(empRows);
        });
      });
      
      const mmvEmployees = deptEmployees.filter(e => e.category === 'ММВ');
      const smvEmployees = deptEmployees.filter(e => e.category === 'СМВ');
      const totalMmvArticles = mmvEmployees.reduce((sum, e) => sum + e.articles_assigned, 0);
      const smvCount = smvEmployees.length;
      
      const complexity = row.complexity || 'M';
      const typesetScore = await getScoring('typeset', complexity);
      const checkScore = await getScoring('check', complexity);
      const selfCheckScore = await getScoring('self_check', complexity);
      
      let departmentScoring = 0;
      
      if (row.category === 'СМВ') {
        const checkMmvArticles = smvCount > 0 ? Math.round(totalMmvArticles / smvCount) : 0;
        departmentScoring = (checkMmvArticles * checkScore) + (row.articles_assigned * selfCheckScore);
      } else if (row.category === 'МВ') {
        departmentScoring = row.articles_assigned * selfCheckScore;
      } else if (row.category === 'ММВ') {
        departmentScoring = row.articles_assigned * typesetScore;
      }
      
      totalScoring += departmentScoring;
      
      let breakdown = {};
      if (row.category === 'СМВ') {
        breakdown.check = smvCount > 0 ? Math.round(totalMmvArticles / smvCount) : 0;
        breakdown.self_check = row.articles_assigned;
        breakdown.typeset = 0;
      } else if (row.category === 'МВ') {
        breakdown.self_check = row.articles_assigned;
        breakdown.check = 0;
        breakdown.typeset = 0;
      } else if (row.category === 'ММВ') {
        breakdown.typeset = row.articles_assigned;
        breakdown.check = 0;
        breakdown.self_check = 0;
      }
      
      scoringByDepartment.push({
        assignment_id: row.assignment_id,
        department_id: deptResult.department_id,
        complexity,
        articles_assigned: row.articles_assigned,
        scoring: departmentScoring,
        breakdown
      });
    }
    
    res.json({
      employee_id: parseInt(employeeId),
      total_scoring: Math.round(totalScoring * 100) / 100,
      scoring_by_department: scoringByDepartment
    });
  });
});

// Статистика распределения с информацией о перегрузке
app.get('/api/analytics', (req, res) => {
  const query = `
    SELECT 
      ed.name as department_name,
      ed.monthly_articles,
      COUNT(ea.employee_id) as assigned_employees,
      COALESCE(SUM(ea.workload_percentage), 0) as total_workload_percentage,
      CASE 
        WHEN ed.monthly_articles > 0 
        THEN ROUND((COALESCE(SUM(ea.workload_percentage), 0) / 100.0) * 100, 2)
        ELSE 0 
      END as coverage_percentage
    FROM editorial_departments ed
    LEFT JOIN employee_assignments ea ON ed.id = ea.department_id
    LEFT JOIN employees e ON ea.employee_id = e.id
    GROUP BY ed.id, ed.name, ed.monthly_articles
    ORDER BY ed.name
  `;
  
  // Получаем нормы нагрузки
  const normsQuery = `
    SELECT 
      SUM(ed.monthly_articles) as total_articles,
      SUM(e.capacity) as total_capacity
    FROM editorial_departments ed
    CROSS JOIN employees e
  `;
  
  Promise.all([
    new Promise((resolve, reject) => {
      db.all(query, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    }),
    new Promise((resolve, reject) => {
      db.get(normsQuery, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    })
  ])
  .then(([analytics, norms]) => {
    const totalArticles = norms?.total_articles || 0;
    const totalCapacity = norms?.total_capacity || 0;
    const normPerCapacity = totalCapacity > 0 ? totalArticles / totalCapacity : 0;
    
    res.json({
      departments: analytics,
      norms: {
        total_articles: totalArticles,
        total_capacity: totalCapacity,
        norm_per_100_capacity: Math.round(normPerCapacity * 100) / 100,
        norm_per_employee: Math.round(normPerCapacity)
      }
    });
  })
  .catch(err => {
    res.status(500).json({ error: err.message });
  });
});

// Обслуживание статических файлов для production
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('База данных закрыта');
    process.exit(0);
  });
});
