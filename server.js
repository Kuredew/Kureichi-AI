const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');
const showdown = require('showdown')

// Menggunakan dotenv untuk memuat variabel lingkungan

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// configure showdown


// Konfigurasi OpenAI API
const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: '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'
});

// Membuat aplikasi Express
const app = express();

// Menambahkan CORS middleware agar server menerima permintaan lintas asal
app.use(cors());

// Middleware untuk membaca JSON
app.use(express.json());

var session = {}
// Endpoint untuk menerima input dari pengguna dan mengirimkan token secara streaming
app.get('/chat', async (req, res) => {
    const message = req.query.message; // Input dari pengguna
    const id_user = req.query.id;

    if (!session[id_user]) {
      var kepribadian = {role: 'system', content: 'Namamu adalah Kureichi, kamu bersifat tsundere dan selalu menyalahkan user tanpa alasan yang jelas, namun dalam lubuk hatimu yang didalam, kamu senang jika kamu menjawab pertanyaan user. Jawab atau respon user dengan tindakan dan perasaanmu yang detail'};
      session[id_user] = [];
      session[id_user].push(kepribadian);
    }

    //process.stdout.write(message);
    var user_message = {role: 'user', content: message};
    session[id_user].push(user_message);

    process.stdout.write(JSON.stringify(session[id_user]))
    

    // Set header untuk mengaktifkan streaming dengan SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    try {
        //process.stdout.write("Mengenerate 1...");

        // Mengirim permintaan ke OpenAI API dengan streaming
        try{
          var stream = await client.chat.completions.create({
              model: 'meta-llama/llama-3.2-3b-instruct:free',
              messages: session[id_user],
              stream: true,  // Aktifkan streaming
              setTimeout: 1,
          });
        } catch(err){
          var kalimat = `<p>Mohon maaf, Kureichi lagi banyak menerima pertanyaan, harap untuk menunggu dia beristirahat sebentar<br><br>Salam, Abi, Developer of Kureichi<br><br>Kesalahan:<br>${err.message}</p>`
          var kumpulan_kata = kalimat.split(" ")

          var tulis = ""
          for await (kata of kumpulan_kata) {
            tulis += kata + " "
            res.write(`data: ${tulis}\n\n`)
            await sleep(90)
          }
          
          res.write('data: [DONE]\n\n')
          return;
        }

        // Mendapatkan token secara bertahap dan kirimkan ke frontend
        var belum_dikonversi = "";
        process.stdout.write("Mengenerate");
        for await (const part of stream) {
            if (part.choices[0].delta.content) {
                var token = part.choices[0].delta.content;
                // Kirimkan token setiap kali ada bagian baru
                var kumpulan_kata = token.split(" ");
                
                for await (const kata of kumpulan_kata){
                    var fixed = kata + " ";
                    belum_dikonversi += fixed;

                    const converter = new showdown.Converter();
                    //var html_implementation = belum_dikonversi.replace(/\n/g, '<br>')
                    sudah_konversi = converter.makeHtml(belum_dikonversi);
                    var html_implementation = sudah_konversi.replace(/\n/g, '<br>');
                    
                    res.write(`data: ${html_implementation}\n\n`);
                    //process.stdout.write(html_implementation);
                    await sleep(90);
                }
            }
        }
        var jawaban = {role: 'assistant', content: belum_dikonversi};
        session[id_user].push(jawaban)

        // Akhiri stream
        res.write('data: [DONE]\n\n');

    } catch (error) {
        console.error('Error with OpenAI API:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

app.get('/', (req, res) => {
    res.send('Hello World from Express!');
});

app.get('/reset', (req, res) => {
  id_user = req.query.id
  session[id_user] = []
  res.send('Berhasil di Reset')
  process.stdout.write('Berhasil')
})

app.get('/chst', (req, res) => {
    // This is where you'll handle the SSE logic
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Handle event sending here (e.g., using res.write)
    let i = 0
    const interval = setInterval(() => {
      res.write(`data: Hello from server ${i++}\n\n`)
    }, 1000)

    req.on('close', () => {
      clearInterval(interval);
      res.end()
    })
  });

app.get('/sffs', async (req, res) => {
    // This is where you'll handle the SSE logic
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Handle event sending here (e.g., using res.write)
    while (true){
        res.write('data: Jangan coba coba\n\n');
        await sleep(1000)
    }
  });


app.post('/sddf', (req, res) => {
    // This is where you'll handle the SSE logic
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Handle event sending here (e.g., using res.write)
    let i = 0
    const interval = setInterval(() => {
      res.write(`data: Hello from server ${i++}\n\n`)
    }, 1000)

    req.on('close', () => {
      clearInterval(interval);
      res.end()
    })
  });


// Menentukan port untuk server
const PORT = 3000;

// Menjalankan server
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
