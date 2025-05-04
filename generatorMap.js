async function getBMUs(){
    response = await fetch(new Request('./testImportJSON.json'), {
        mode: 'no-cors'
    });

    let bmus = await response.json();
    // console.log(bmus);
    return bmus;
}


