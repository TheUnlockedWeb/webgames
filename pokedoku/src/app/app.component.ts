import { devOnlyGuardedExpression } from '@angular/compiler';
import { Component } from '@angular/core';
import { HostListener, OnInit, Renderer2, ElementRef } from '@angular/core';
import { AfterViewInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { SearchPokemonComponent } from './search-pokemon/search-pokemon.component';

export interface Pokemon {
  url: string;
  name: string;
  type: string;
}


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})

export class AppComponent implements AfterViewInit {
  containerWidth: string = '32rem';  // Default width

  title = 'pokedoku';
  pokemons: any = [];

  constructor(private renderer: Renderer2, private el: ElementRef,public dialog: MatDialog) {}

  openDialog(pokemon: { name: any; otherData: any; url: string; }): void {
    this.dialog.open(SearchPokemonComponent, {
      maxWidth: '90vw',
      height: '50vh',
      data: { name: pokemon.name, otherData: pokemon.otherData } // Pass data to the dialog here
    });
  }
  ngOnInit() {


    let link = "assets/types/dragon.png";
    let link2 = "assets/types/1st-evo.png";
    this.pokemons.push({url: 'assets/a.png', name: "", type: 'logo'});
    this.pokemons.push({url: link , name: 'ivysaur', type: 'custom'});
    this.pokemons.push({url: link, name: 'venusaur', type: 'custom'});
    this.pokemons.push({url: link2, name: 'charmander', type: 'custom'});
    this.pokemons.push({url: link, name: 'charmeleon', type: 'custom'});
    this.pokemons.push({url: 'https://play.pokemonshowdown.com/sprites/ani/kangaskhan-mega.gif', name: 'Mega Kangaskhan', type: 'fire'});
    this.pokemons.push({url: 'https://play.pokemonshowdown.com/sprites/ani-shiny/hitmonlee.gif', name: 'Hitmonlee', type: 'water'});
    this.pokemons.push({url: 'https://play.pokemonshowdown.com/sprites/ani-shiny/umbreon.gif', name: 'Umbreon', type: 'water'});
    this.pokemons.push({url: link2, name: 'blastoise', type: 'custom'});
    this.pokemons.push({url: 'https://play.pokemonshowdown.com/sprites/ani/crabominable.gif', name: 'Crabominable', type: 'bug'});
    this.pokemons.push({url: 'https://play.pokemonshowdown.com/sprites/ani-shiny/weavile.gif', name: 'Weavile', type: 'bug'});
    this.pokemons.push({url: 'https://play.pokemonshowdown.com/sprites/ani-shiny/snorlax.gif', name: 'Snorlax', type: 'bug  '});
    this.pokemons.push({url: link, name: 'blastoise', type: 'custom'});
    this.pokemons.push({url: 'https://play.pokemonshowdown.com/sprites/ani/gengar.gif', name: 'Gengar', type: 'bug'});
    this.pokemons.push({url: 'https://play.pokemonshowdown.com/sprites/ani-shiny/jirachi.gif', name: 'Jirachi', type: 'bug'});
    this.pokemons.push({url: 'https://play.pokemonshowdown.com/sprites/ani/darkrai.gif', name: 'Darkrai', type: 'bug'});

  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.resizeContainer();

    this.pokemons.forEach((pokemon: any, index: any) => {
      this.setImageBackgroundSize(pokemon, index);
    });
  }

  ngAfterViewInit() {
    console.log('AppComponent ngOnViewInit called');
    this.resizeContainer(); // dsdsdsds resize
    this.pokemons.forEach((pokemon: any, index: any) => {
      this.setImageBackgroundSize(pokemon, index);
    });
  
  }
  tabChanged = (tabChangeEvent: MatTabChangeEvent): void => {
    console.log('tabChangeEvent => ', tabChangeEvent);
    this.resizeContainer();
    this.pokemons.forEach((pokemon: any, index: any) => {
      this.setImageBackgroundSize(pokemon, index);
    });
}
  isTileAlignEnd(index: number) {
    switch (index) {
      case 1:
        return true;
      case 3:
        return true;
      case 2:
        return true;
    }
    return false;
  }
  resizeContainer() {
    console.log('resizeContainer called');
    const remSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const windowWidthRem = window.innerWidth / remSize;
    let marginLeft= 0;
    if (windowWidthRem < 32) {
      this.containerWidth = `${windowWidthRem}rem`;
      for (let i = 0; i < this.pokemons.length; i++) {
        // get by tile-i 
        const test = this.el.nativeElement.querySelector(`#tile-${i}`);
        this.renderer.setStyle(test, 'margin-left', `0px`);
      }
    } else {
      const tileElement = document.getElementById(`tile-0`);

      // Add null check for tileElement
      if (tileElement && windowWidthRem > 32 + ((tileElement.clientWidth / remSize)+2)/2)  {
        // on ajoute u  n margin left de - tileElement.clientWidth / remSize pour centrer le container
        for (let i = 0; i < this.pokemons.length; i++) {
          // get by tile-i 
          const test = this.el.nativeElement.querySelector(`#tile-${i}`);
          let margin = (tileElement.clientWidth / remSize)/2;
          this.renderer.setStyle(test, 'margin-left', `-${margin}rem`);
        } 
      } else{
        for (let i = 0; i < this.pokemons.length; i++) {
          // get by tile-i 
          const test = this.el.nativeElement.querySelector(`#tile-${i}`);
          this.renderer.setStyle(test, 'margin-left', `0px`);
        }
      }

      this.containerWidth = '32rem';
     
    }
    const gridContainer = this.el.nativeElement.querySelector('.grid-container');
    this.renderer.setStyle(gridContainer, 'width', this.containerWidth);
    if(marginLeft != 0){
      this.renderer.setStyle(gridContainer, 'margin', `-${marginLeft}rem !important`);
    }
  }
  setImageBackgroundSize(pokemon :any, index: any) {
    const img = new Image();
    img.onload = () => {
      // Get the tile element by ID
      const tileElement = document.getElementById(`tile-${index}`);

      // Check if tileElement is not null
      if (tileElement) {
        // Assume a fixed tile size (replace with your actual tile dimensions)
        const tileWidth = tileElement.clientWidth;
        const tileHeight = tileElement.clientHeight;

        // If the image size is larger than the tile, set the background size to 'contain'
        if (img.width > tileWidth || img.height > tileHeight) {
          tileElement.style.backgroundSize = 'contain';
        }
        else{
          tileElement.style.backgroundSize = 'auto';
        }
      }
    };
    img.src = pokemon.url;
  }
}
