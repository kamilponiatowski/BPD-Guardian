const fs = require('fs');
const path = require('path');

// Funkcja do naprawiania ścieżek w plikach HTML
function fixPathsInHTML() {
  const htmlFiles = fs.readdirSync('./dist').filter(file => file.endsWith('.html'));
  
  htmlFiles.forEach(file => {
    const filePath = path.join('./dist', file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Zaktualizuj wszystkie linki do plików CSS na index.css
    content = content.replace(
      /<link rel="stylesheet" href="css\/.*?\.css">/,
      '<link rel="stylesheet" href="css/index.css">'
    );
    
    // Usuń pozostałe linki do CSS, zostawiając tylko pierwszy (który właśnie zamieniliśmy)
    const cssLinkPattern = /<link rel="stylesheet" href="css\/.*?\.css">/g;
    const matches = content.match(cssLinkPattern) || [];
    
    if (matches.length > 1) {
      // Zachowaj pierwsze wystąpienie (już zamienione na index.css)
      const firstMatch = matches[0];
      // Usuń wszystkie wystąpienia
      content = content.replace(cssLinkPattern, '');
      // Dodaj z powrotem tylko pierwsze wystąpienie
      content = content.replace(/<head>/, `<head>\n    ${firstMatch}`);
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated paths in ${file}`);
  });
}

// Uruchomienie funkcji
fixPathsInHTML();
console.log('Path fixing completed');