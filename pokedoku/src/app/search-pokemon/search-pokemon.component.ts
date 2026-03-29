import { Component } from '@angular/core';
import { Pokemon } from '../app.component'
import { FormsModule } from '@angular/forms'; // Import the FormsModule

@Component({
  selector: 'app-search-pokemon',
  templateUrl: './search-pokemon.component.html',
  styleUrl: './search-pokemon.component.css'
})



export class SearchPokemonComponent {
  filterValue: string = '';
  pokemonListFront: Pokemon[] = [];

  pokemonList: Pokemon[] = [];
  constructor() {
    this.pokemonList.push({url: 'https://play.pokemonshowdown.com/sprites/ani/kangaskhan-mega.gif', name: 'Mega Kangaskhan', type: 'fire'});
    this.pokemonList.push({url: 'https://play.pokemonshowdown.com/sprites/ani-shiny/hitmonlee.gif', name: 'Hitmonlee', type: 'water'});
    this.pokemonList.push({url: 'https://play.pokemonshowdown.com/sprites/ani-shiny/umbreon.gif', name: 'Umbreon', type: 'water'});
    this.pokemonList.push({url: 'https://play.pokemonshowdown.com/sprites/ani/crabominable.gif', name: 'Crabominable', type: 'bug'});
    this.pokemonList.push({url: 'https://play.pokemonshowdown.com/sprites/ani-shiny/weavile.gif', name: 'Weavile', type: 'bug'});
    this.pokemonList.push({url: 'https://play.pokemonshowdown.com/sprites/ani-shiny/snorlax.gif', name: 'Snorlax', type: 'bug'});
    this.pokemonListFront = this.pokemonList;
  }
  
  filterPokemonList() {
    this.pokemonListFront = this.pokemonList.filter(pokemon => pokemon.name.toLowerCase().includes(this.filterValue.toLowerCase()));
  }

}
