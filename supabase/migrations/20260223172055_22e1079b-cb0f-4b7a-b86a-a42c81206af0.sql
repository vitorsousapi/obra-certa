-- Aumentar o limite de tamanho de arquivo para o bucket de anexos para 200MB
UPDATE storage.buckets 
SET file_size_limit = 209715200 
WHERE id = 'etapa-anexos';