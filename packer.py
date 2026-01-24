import os

# Configurações
output_file = "full_project_code.txt"

# --- CORREÇÃO AQUI: Adicionei 'venv', '.venv', 'env' ---
ignore_dirs = {
    '.git', 'node_modules', 'dist', 'build', '__pycache__', 
    '.next', 'coverage', 'venv', '.venv', 'env', '.idea', '.vscode'
}

# Extensões para ignorar (imagens, logs, executaveis, etc)
ignore_exts = {
    '.png', '.jpg', '.jpeg', '.svg', '.ico', '.log', '.lock', 
    '.json', '.exe', '.dll', '.so', '.pyc'
} 

def pack_project():
    # Remove o arquivo antigo se existir para começar do zero
    if os.path.exists(output_file):
        os.remove(output_file)

    with open(output_file, 'w', encoding='utf-8') as outfile:
        count = 0
        for root, dirs, files in os.walk("."):
            # Modifica a lista 'dirs' in-place para pular pastas ignoradas
            # Isso impede que o script entre dentro da venv
            dirs[:] = [d for d in dirs if d not in ignore_dirs]
            
            for file in files:
                file_ext = os.path.splitext(file)[1]
                
                if file == "packer.py" or file == output_file:
                    continue
                
                if file_ext in ignore_exts:
                    continue

                file_path = os.path.join(root, file)
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as infile:
                        content = infile.read()
                        
                        outfile.write("=" * 80 + "\n")
                        outfile.write(f"File: {file_path}\n")
                        outfile.write("=" * 80 + "\n")
                        outfile.write(content + "\n\n")
                        
                        print(f"Adicionado: {file_path}")
                        count += 1
                except Exception as e:
                    # Ignora erros de leitura (arquivos binários, etc)
                    pass

    print(f"\n--- Sucesso! {count} arquivos do projeto (sem bibliotecas) salvos em {output_file} ---")

if __name__ == "__main__":
    pack_project()