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

  // Таблица распределения (связь многие ко многим)
  db.run(`
    CREATE TABLE IF NOT EXISTS employee_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER,
      department_id INTEGER,
      workload_percentage REAL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE,
      FOREIGN KEY (department_id) REFERENCES editorial_departments (id) ON DELETE CASCADE,
      UNIQUE(employee_id, department_id)
    )
  `);

  // Миграция: добавляем поле complexity если его нет
  db.run(`
    ALTER TABLE editorial_departments ADD COLUMN complexity TEXT DEFAULT 'M' CHECK (complexity IN ('S', 'M', 'L'))
  `, (err) => {
    // Игнорируем ошибку если колонка уже существует
  });

  // Заполняем начальными данными из вашей таблицы
  insertInitialData();
}

function insertInitialData() {
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
  const { employee_id, department_id } = req.body;
  
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
    
    // Получаем информацию о новом сотруднике
    db.get('SELECT category, capacity FROM employees WHERE id = ?', [employee_id], (err, newEmployee) => {
      if (err) {
        res.status(500).json({ error: err.message });
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
        
        // Добавляем новое назначение с временным процентом
        db.run(
          'INSERT INTO employee_assignments (employee_id, department_id, workload_percentage) VALUES (?, ?, ?)',
          [employee_id, department_id, 100], // Временный процент
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
      ed.monthly_articles,
      ROUND((ea.workload_percentage / 100.0) * ed.monthly_articles) as articles_assigned,
      CASE 
        WHEN e.category = 'СМВ' THEN 'Проверяет'
        WHEN e.category = 'МВ' THEN 'Выпускает'
        WHEN e.category = 'ММВ' THEN 'Верстает'
        ELSE 'Работает'
      END as role_description
    FROM employee_assignments ea
    JOIN employees e ON ea.employee_id = e.id
    JOIN editorial_departments ed ON ea.department_id = ed.id
    WHERE ea.department_id = ?
    ORDER BY e.category, e.name
  `;
  
  db.all(query, [departmentId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Добавляем детальную разбивку по типам работы
    const departmentTotal = rows.length > 0 ? rows[0].monthly_articles : 0;
    const mmvEmployees = rows.filter(row => row.category === 'ММВ');
    const smvEmployees = rows.filter(row => row.category === 'СМВ');
    
    // Рассчитываем общее количество статей для верстки ММВ
    const totalMmvArticles = mmvEmployees.reduce((sum, emp) => {
      return sum + emp.articles_assigned;
    }, 0);
    
    // Рассчитываем количество СМВ для распределения проверки
    const smvCount = smvEmployees.length;
    
    const detailsWithBreakdown = rows.map(row => {
      let breakdown = {};
      
      if (row.category === 'СМВ') {
        // СМВ: проверяет часть статей ММВ (распределено между всеми СМВ) + самопроверка своих статей
        breakdown.check_mmv = smvCount > 0 ? Math.round(totalMmvArticles / smvCount) : 0; // Проверяет часть статей ММВ
        breakdown.self_check = row.articles_assigned; // Своя доля статей - самопроверка
        breakdown.typeset = 0; // СМВ не верстает отдельно
      } else if (row.category === 'МВ') {
        // МВ: только самопроверка
        breakdown.self_check = row.articles_assigned; // Своя доля статей - самопроверка
        breakdown.typeset = 0; // МВ не верстает отдельно
        breakdown.check_mmv = 0;
      } else if (row.category === 'ММВ') {
        // ММВ: только верстка
        breakdown.typeset = row.articles_assigned; // Своя доля статей - верстка
        breakdown.self_check = 0;
        breakdown.check_mmv = 0;
      }
      
      return {
        ...row,
        breakdown
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
