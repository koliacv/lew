# lew

Тренажер підготовки до **Lekarski Egzamin Weryfikacyjny (LEW)**: 500 авторських питань польською у 10 темах по 50, пояснення польською та українською з негайною перевіркою кожної відповіді.

## Можливості

- Єдиний формат: вибрати варіант → «Odpowiedz» → результат, час і пояснення PL/UA → наступне питання.
- Пробний LEW на 200 питань (по 20 із теми) або тематична сесія на 10, 20, 40 чи 50 питань.
- Бажаний час — 70 секунд на питання. Перевищення не блокує відповідь і не завершує сесію.
- Підтверджена відповідь незмінна. Таймер зупиняється при підтвердженні; читання пояснення не входить у час відповіді. Нове питання починає свій відлік.
- Підсумок правильних/неправильних відповідей, середнього часу та кількості відповідей до 70 секунд. При достроковому завершенні відсоток рахується лише за підтвердженими відповідями.
- Питання та варіанти перемішуються. Історія показів у браузері надає перевагу новим питанням і відкладає нещодавно показані.
- Пошук тем, світла/темна палітра, мобільна верстка від 320 px та закріплена основна кнопка.
- Це навчальний формат із негайним розбором, а не симуляція умов офіційного іспиту.

## Публікація на GitHub Pages

Очікувана адреса після успішного розгортання: **https://koliacv.github.io/lew/**.

1. Відкрий [Settings → Pages](https://github.com/koliacv/lew/settings/pages).
2. У **Build and deployment → Source** вибери **GitHub Actions**.
3. Відкрий [Actions → Deploy LEW to GitHub Pages](https://github.com/koliacv/lew/actions/workflows/pages.yml).
4. Запусти **Run workflow → main**, якщо перший запуск завершився до ввімкнення Pages.
5. Дочекайся успішних `build` і `deploy`. Посилання на сайт буде в результаті розгортання.

Наступні push у `main` автоматично перевіряють і публікують сайт. Для PR виконуються лише перевірка і збірка. Секрети, токени та зовнішній сервер не потрібні. Workflow використовує штатний `GITHUB_TOKEN` з мінімальними правами на розгортання.

Альтернатива без Actions: вибери **Deploy from a branch → main → / (root)**. Кореневий `index.html` і відносні шляхи дозволяють публікацію без збірки; при такому варіанті прибери workflow `pages.yml`, щоб не запускати другий спосіб розгортання одночасно.

## Локальний запуск

Для перевірок потрібен Node.js 22 або новіший. Зовнішніх npm-залежностей немає, тому `npm install` не потрібен.

```sh
npm test
npm run build
python3 -m http.server 8000 --directory dist
```

Відкрий http://localhost:8000. Для швидкої розробки можна запускати `python3 -m http.server 8000` у корені репозиторію. Не відкривай `index.html` через `file://`: банк питань завантажується з локального HTTP-сервера.

## Структура

| Файл | Призначення |
| --- | --- |
| `index.html` | Сторінка й інформація про межі навчальної бази |
| `assets/style.css` | Адаптивні стилі |
| `src/app.js` | Інтерфейс, навігація, перевірка й таймер |
| `src/explanation-visual.js` | Наочна карта пояснення, відтворення й доступність |
| `src/quiz.js` | Перемішування, створення сесії, оцінювання та валідація даних |
| `data/questions.json` | 500 питань, варіанти, пояснення PL/UA, додаткові мнемонічні дані |
| `data/sources.json` | Назви вихідних навчальних матеріалів |
| `tests/` | Автоматизовані перевірки |
| `scripts/build.mjs` | Збірка статичних файлів у `dist/` |
| `.github/workflows/pages.yml` | Перевірка та GitHub Pages deployment |
| `CONTENT.md` | Походження матеріалів, формат даних і обмеження |
| `COVERAGE.md` | Покриття тем і межі перевірки банку |

## Дані та приватність

Сайт не використовує аналітику, cookies, зовнішні шрифти, акаунти чи базу даних. Відповіді зберігаються тільки в пам'яті відкритої вкладки; оновлення сторінки скидає їх. Кожен учасник має свою сесію відповідей. Для рідкісних повторів `localStorage` зберігає тільки ID показаних питань, кількість показів і час останнього показу. Історія спільна для профілю браузера на цьому пристрої, без синхронізації. На спільному пристрої різним учасникам потрібні різні профілі. Недоступний або переповнений storage дає тимчасову історію у вкладці. У розділі «Inteligentne losowanie» можна видалити історію після підтвердження. GitHub Pages обслуговує звичайні запити до статичних файлів.

Оригінальні PDF/DOC/DOCX не публікуються. У репозиторії — лише код, авторські питання й назви матеріалів. Це навчальний тренажер, а не захищена платформа офіційного іспиту: ключ відповідей доступний у відкритому JSON.

## Межі бази

Це не офіційна база CEM і не гарантія повного покриття програми. Поділ на 10 рівних тем не відтворює офіційних пропорцій LEW. Банк потребує незалежної лікарської рецензії; використання — для навчання, не клінічних рішень. Докладніше: [CONTENT.md](CONTENT.md).

### Interfejs treningowy

Panel startowy pokazuje pokrycie bazy oraz nowe pytania w każdej dziedzinie (to nie jest ocena opanowania materiału). Wyszukiwarka tematów toleruje brak polskich znaków. Na komputerze ustawienia sesji pozostają obok tematów; na telefonie wybór tematu przenosi do ustawień. Motyw jasny/ciemny domyślnie odpowiada ustawieniu systemu i można go przełączyć w nagłówku na czas otwarcia strony.

W każdym teście zatwierdzenie odpowiedzi od razu pokazuje wynik, czas i wyjaśnienia PL/UA. Cel to 70 sekund na pytanie, bez automatycznego zakończenia. Nie ma dodatkowych trybów, oznaczeń ani mapy pytań. Wyjaśnienie zawiera interaktywny atlas: 13 realistycznych plansz anatomicznych, punkty z opisami PL/UA i powiększenie 100–300%. Dopasowanie korzysta z treści pytania, poprawnej odpowiedzi i haseł, nigdy z dystraktorów. Przy braku dopasowania można ręcznie wybrać planszę. To kontekst anatomiczny, nie obraz patologii konkretnego przypadku. Źródła i licencje: assets/atlas/ATTRIBUTION.md. Dolny pasek na telefonie zawiera jedną główną akcję: odpowiedz lub przejdź dalej.
