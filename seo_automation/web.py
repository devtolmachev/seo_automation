from flask import Flask, render_template


app = Flask(__name__)


@app.get('/how-it-works')
async def index():
    # return render_template('index.html')
    # return render_template('index2.html')
    return render_template('index4.html')

@app.get('/test_data')
async def test_data():
    # with open('test_data.json') as f:
    #     return f.read()
    # with open('test_data2.json') as f:
    #     return f.read()
    with open('test_data3.json') as f:
        return f.read()

@app.get('/external_link_old')
async def external_link_old():
    return "<b>External link old</b>"
    
@app.get('/external_link')
async def external_link():
    return "<b>External link</b>"

@app.get('/internal_link_old')
async def internal_link_old():
    return "<b>Internal link old</b>"
    
@app.get('/internal_link')
async def internal_link():
    return "<b>Internal link</b>"


if __name__ == '__main__':
    app.run('0.0.0.0', 6785, debug=True)
