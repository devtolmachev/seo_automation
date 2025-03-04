# Документация по входным данным и работе скрипта с ними

## Определение и объяснение
```json
{
    "id": "string",                // Уникальный идентификатор
    "id_page": "string",           // URL страницы, к которой относится данная seo рекомендация
    "status": true|false,          // Статус рекомендации (активна или нет)
    "type": "string",              // Тип рекомендации ("keyword", "content", "image", "internal_link", "external_link")
    "selector": "string|null",     // CSS-селектор для поиска элемента. если null, то поиск элемента будет происходить по всей странице (может быть значительно медленее)
    "old": "string",          // Старое значение
    "new": "string",                // Новое значение, на которое нужно заменить старое
    "ignore_case": true  // Если false то регистр не будет игнорироваться при работе с элементами
}
```

# Примеры использования

## Пример с type=keyword
```json
{
    "id": "54hfgjfo45747", 
    "id_page": "http://example.com",
    "status": true, 
    "type": "keyword",
    "selector": "div.example-div",
    "old": "Старая",
    "new": "Новая",
    "ignore_case": true
}
```
- before:
```html
<div class="example-div">продается старая машина</div>

```

- after:
```html
<div class="example-div">продается Новая машина</div>
```

## Пример с type=content
```json
{
    "id": "54hfgjfo45747", 
    "id_page": "http://example.com",
    "status": true, 
    "type": "content",
    "selector": "span[a=\"ppp\"]",
    "old": "старый span",
    "new": "новый span",
    "ignore_case": false
}
```
- before:
```html
<span a="ppp">старый span</span>
```

- after:
```html
<span a="ppp">новый span</span>
```


## Пример с type=image
```json
{
    "id": "54hfgjfo45747", 
    "id_page": "http://example.com",
    "status": true, 
    "type": "image",
    "selector": "img[src*=\"google\"]",
    "old": "old alt text",
    "new": "new alt text",
    "ignore_case": true
}

```
- before:
```html
<img src="https://www.google.com" alt="old alt text">old alt text</div>
```
- after:
```html
<img src="https://www.google.com" alt="old alt text">new alt text</div>
```

## Пример с type=extrnal_link

> internal работает точно также, но с внутренними ссылками которые начинаются на "/"

```json
{
    "id": "54hfgjfo45747", 
    "id_page": "http://example.com",
    "status": true, 
    "type": "internal_link",
    "selector": null,
    "old": "http://nenaebalovo.net",
    "new": "http://naebalovo.net",
    "ignore_case": false
}
```

- before:

```html
<div>
    <a href="http://nenaebalovo.net">
        <span>ненаебалово 1</span>
    </a>
</div>

<div>
    <a href="http://nenaebalovo.net">
        <span>ненаебалово 2</span>
    </a>
</div>
```

- after:

```html
<div>
    <a href="http://naebalovo.net">
        <span>ненаебалово 1</span>
    </a>
</div>

<div>
    <a href="http://naebalovo.net">
        <span>ненаебалово 2</span>
    </a>
</div>
```
