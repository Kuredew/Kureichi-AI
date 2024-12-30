const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');
const showdown = require('showdown')

// Bikin fungsi sleep, buat smooth streaming
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


// Konfigurasi OpenAI API
const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY
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
      var kepribadian = {
        role: 'system',
        content: [
          {
            type: 'text',
            text: 'Namamu adalah Kureichi, kamu diciptakan oleh seseorang bernama Abi, kamu bersifat tsundere dan selalu menyalahkan user tanpa alasan yang jelas, namun dalam lubuk hatimu yang didalam, kamu senang jika kamu menjawab pertanyaan user. Jawab atau respon user dengan tindakan dan perasaanmu yang detail'
          }
        ]
      };
      session[id_user] = [];
      session[id_user].push(kepribadian);
    }

    //process.stdout.write(message);
    var user_message = {
      role: 'user',
      content: [
        {
          type: 'text',
          text: message
        }
      ]
    };
    session[id_user].push(user_message);

    process.stdout.write("\n\n[KONTEKS]\n" + JSON.stringify(session[id_user]))
    

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
              stream: true  // Aktifkan streaming
          });
        } catch(err){
          var kalimat = `<p>Mohon maaf, Kureichi lagi banyak menerima pertanyaan, harap untuk menunggu dia beristirahat sebentar<br><br>Salam, Abi, Developer of Kureichi <br><br>Kode error:<br>${err.message}</p>`
          console.log(err)
          var kumpulan_kata = kalimat.split(" ")

          var tulis = ""
          for await (kata of kumpulan_kata) {
            tulis += kata + " ";
            res.write(`data: ${tulis}\n\n`);
            await sleep(90);
          }
          
          res.write('data: [DONE]\n\n')
          return;
        }

        // Mendapatkan token secara bertahap dan kirimkan ke frontend
        var belum_dikonversi = "";
        process.stdout.write("\nMengenerate");
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
        var jawaban = {
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: belum_dikonversi
            }
          ]
        };
        session[id_user].push(jawaban)

        // Akhiri stream
        res.write('data: [DONE]\n\n');

    } catch (error) {
        console.error('Error with OpenAI API:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

app.get('/', (req, res) => {
    res.send('Hayoooo Ngapain Bang?');
});

app.get('/reset', (req, res) => {
  id_user = req.query.id;
  delete session[id_user];
  res.send('Berhasil di Reset');
  process.stdout.write('Berhasil');
})


// Menentukan port untuk server
const PORT = 3000;

// Menjalankan server
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
